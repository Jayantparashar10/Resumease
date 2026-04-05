from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone

from app.middleware.rate_limit import limiter
from app.models.user import (
    GoogleLoginRequest,
    OnboardingRequest,
    ProfileUpdateRequest,
    RecruiterOnboardingData,
    StudentOnboardingData,
    UserPublic,
    TokenResponse,
)
from app.services.auth import (
    get_current_user,
)
from app.services.supabase_auth import (
    SupabaseAuthError,
    exchange_google_token_for_session,
    logout as supabase_logout,
    update_profile as update_supabase_profile,
    upsert_profile_from_user,
)

import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Only allow safe URL schemes for stored avatar URLs
_SAFE_URL_PATTERN = re.compile(r"^https?://", re.IGNORECASE)


def _sanitize_avatar_url(url: str | None) -> str | None:
    """Reject non-http(s) URLs to prevent javascript: and data: scheme injection."""
    if url is None:
        return None
    if not _SAFE_URL_PATTERN.match(url):
        raise HTTPException(
            status_code=422,
            detail="avatar_url must start with http:// or https://",
        )
    return url


def to_public_user(doc: dict) -> UserPublic:
    created_at = doc.get("created_at") or datetime.now(timezone.utc)
    return UserPublic(
        id=doc["_id"],
        email=doc["email"],
        full_name=doc["full_name"],
        role=doc["role"],
        avatar_url=doc.get("avatar_url"),
        onboarding_completed=doc.get("onboarding_completed", False),
        created_at=created_at,
        is_active=doc["is_active"],
    )


@router.post("/google", response_model=TokenResponse)
@limiter.limit("10/minute")
async def google_login(request: Request, payload: GoogleLoginRequest):
    """Exchange a Google ID token for a Supabase session.

    Rate-limited to 10 requests per minute per IP to prevent abuse.
    """
    try:
        session_data = await exchange_google_token_for_session(payload.id_token)
        access_token = session_data["access_token"]
        sb_user = session_data["user"]

        profile = await upsert_profile_from_user(sb_user)
        user_doc = {
            "_id": sb_user["id"],
            "email": profile.get("email") or sb_user.get("email"),
            "full_name": profile.get("full_name") or (sb_user.get("email", "user").split("@")[0]),
            "role": profile.get("role", "student"),
            "avatar_url": profile.get("avatar_url"),
            "onboarding_completed": profile.get("onboarding_completed", False),
            "created_at": profile.get("created_at") or datetime.now(timezone.utc),
            "is_active": profile.get("is_active", True),
        }

        user_public = to_public_user(user_doc)
        return TokenResponse(
            access_token=access_token,
            user=user_public,
            onboarding_completed=user_public.onboarding_completed,
        )
    except SupabaseAuthError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get("/me", response_model=UserPublic)
async def me(current_user=Depends(get_current_user)):
    return to_public_user(current_user)


@router.post("/logout", status_code=204)
async def logout(request: Request, current_user=Depends(get_current_user)):
    """Revoke the Supabase session server-side and invalidate the access token."""
    credentials = request.headers.get("Authorization", "")
    token = credentials.removeprefix("Bearer ").strip()
    if token:
        try:
            await supabase_logout(token)
        except SupabaseAuthError as exc:
            # Log the error but don't block the client from logging out
            logger.warning("Supabase logout returned an error: %s", exc)
    return None


@router.post("/onboarding", response_model=UserPublic)
async def complete_onboarding(
    payload: OnboardingRequest,
    current_user=Depends(get_current_user),
):
    if current_user.get("onboarding_completed") and payload.role != current_user.get("role"):
        raise HTTPException(status_code=400, detail="Role cannot be changed after onboarding")

    try:
        if payload.role == "student":
            validated = StudentOnboardingData.model_validate(payload.data)
        else:
            validated = RecruiterOnboardingData.model_validate(payload.data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid onboarding payload: {exc}")

    try:
        updated = await update_supabase_profile(
            current_user["_id"],
            {
                "role": payload.role,
                "onboarding_data": validated.model_dump(),
                "onboarding_completed": True,
            },
        )
    except SupabaseAuthError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return to_public_user(
        {
            "_id": updated["user_id"],
            "email": updated.get("email", current_user.get("email")),
            "full_name": updated.get("full_name", current_user.get("full_name")),
            "role": updated.get("role", payload.role),
            "avatar_url": updated.get("avatar_url"),
            "onboarding_completed": updated.get("onboarding_completed", True),
            "created_at": updated.get("created_at") or current_user.get("created_at"),
            "is_active": updated.get("is_active", True),
        }
    )


@router.put("/profile", response_model=UserPublic)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user=Depends(get_current_user),
):
    updates: dict = {}
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name
    if payload.avatar_url is not None:
        updates["avatar_url"] = _sanitize_avatar_url(payload.avatar_url)

    if payload.onboarding_data is not None:
        try:
            if current_user.get("role") == "student":
                validated = StudentOnboardingData.model_validate(payload.onboarding_data)
            elif current_user.get("role") == "recruiter":
                validated = RecruiterOnboardingData.model_validate(payload.onboarding_data)
            else:
                raise HTTPException(status_code=403, detail="Role not allowed for onboarding data update")
            updates["onboarding_data"] = validated.model_dump()
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Invalid profile payload: {exc}")

    if not updates:
        raise HTTPException(status_code=400, detail="No profile fields provided")

    try:
        updated = await update_supabase_profile(current_user["_id"], updates)
    except SupabaseAuthError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return to_public_user(
        {
            "_id": updated["user_id"],
            "email": updated.get("email", current_user.get("email")),
            "full_name": updated.get("full_name", current_user.get("full_name")),
            "role": updated.get("role", current_user.get("role", "student")),
            "avatar_url": updated.get("avatar_url"),
            "onboarding_completed": updated.get("onboarding_completed", current_user.get("onboarding_completed", False)),
            "created_at": updated.get("created_at") or current_user.get("created_at"),
            "is_active": updated.get("is_active", True),
        }
    )
