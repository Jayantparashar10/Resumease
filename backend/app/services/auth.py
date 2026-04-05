"""
Auth service helpers for FastAPI dependency injection.

This application delegates all authentication to Supabase Auth. Tokens are
issued and verified by Supabase; we never mint our own JWTs. The functions
below are pure FastAPI `Depends`-compatible helpers that validate the
Supabase-issued Bearer token on each request and enrich it with profile data.

NOTE: hash_password / verify_password / create_access_token / decode_token
were removed. They were dead code — Supabase manages credentials. Leaving
home-grown password utilities alongside a delegation-based auth system is a
maintenance hazard and invites future misuse.
"""

from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.supabase_auth import (
    SupabaseAuthError,
    get_profile,
    get_user_from_access_token,
)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Validate the Supabase Bearer token and return a merged user dict.

    Raises HTTP 401 if the token is missing, expired, or invalid.
    Raises HTTP 403 if the account is deactivated.
    """
    token = credentials.credentials
    try:
        sb_user = await get_user_from_access_token(token)
        user_id = sb_user.get("id")
        email = sb_user.get("email")
        metadata = sb_user.get("user_metadata") or {}
        profile = await get_profile(user_id) if user_id else None

        merged_user = {
            "_id": user_id,
            "email": email,
            "full_name": (
                (profile or {}).get("full_name")
                or metadata.get("full_name")
                or metadata.get("name")
                or (email.split("@")[0] if email else "user")
            ),
            "role": (profile or {}).get("role", "student"),
            "avatar_url": (
                (profile or {}).get("avatar_url")
                or metadata.get("avatar_url")
                or metadata.get("picture")
            ),
            "onboarding_completed": (profile or {}).get("onboarding_completed", False),
            "onboarding_data": (profile or {}).get("onboarding_data", {}),
            "created_at": (profile or {}).get("created_at") or datetime.now(timezone.utc),
            "is_active": (profile or {}).get("is_active", True),
        }

        if not merged_user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        return merged_user
    except SupabaseAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",  # Never forward raw Supabase error text
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_onboarded_user(user=Depends(get_current_user)) -> dict:
    if not user.get("onboarding_completed", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete onboarding to access this resource",
        )
    return user


async def get_current_onboarded_student(user=Depends(get_current_onboarded_user)) -> dict:
    if user.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required",
        )
    return user


async def get_current_recruiter(user=Depends(get_current_user)) -> dict:
    if user.get("role") != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter access required",
        )
    return user


async def get_current_onboarded_recruiter(user=Depends(get_current_onboarded_user)) -> dict:
    if user.get("role") != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter access required",
        )
    return user
