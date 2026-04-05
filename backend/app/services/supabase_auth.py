"""
Supabase Auth + REST API helpers.

Error handling policy:
  - Full error detail (including raw Supabase responses) is ONLY logged server-side.
  - SupabaseAuthError messages surfaced to callers are sanitized to avoid leaking
    internal service details to HTTP clients.
"""

from datetime import datetime, timezone
from typing import Any

import httpx
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class SupabaseAuthError(Exception):
    """Raised when Supabase auth or profile calls fail."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def _require_supabase_config() -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise SupabaseAuthError("Authentication service is not configured", status_code=500)


def _service_headers() -> dict[str, str]:
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseAuthError("Authentication service role key is not configured", status_code=500)
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def _anon_headers() -> dict[str, str]:
    _require_supabase_config()
    return {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }


async def exchange_google_token_for_session(id_token: str) -> dict[str, Any]:
    """Exchange Google ID token for a Supabase session token."""
    _require_supabase_config()
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=id_token"
    payload = {"provider": "google", "id_token": id_token}

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, json=payload, headers=_anon_headers())

    if resp.status_code >= 400:
        # Log full detail server-side, surface a generic message to the caller
        logger.warning("Supabase token exchange failed [%d]: %s", resp.status_code, resp.text)
        raise SupabaseAuthError(
            "Google sign-in failed. Please try again.",
            status_code=resp.status_code if resp.status_code < 500 else 502,
        )

    data = resp.json()
    if not data.get("access_token") or not data.get("user"):
        logger.error("Supabase token exchange returned incomplete payload: %s", list(data.keys()))
        raise SupabaseAuthError("Authentication service returned an incomplete response")

    return data


async def get_user_from_access_token(access_token: str) -> dict[str, Any]:
    """Resolve Supabase user from access token."""
    _require_supabase_config()
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code >= 400:
        logger.debug("Supabase token validation failed [%d]", resp.status_code)
        raise SupabaseAuthError("Invalid or expired session", status_code=401)

    return resp.json()


async def logout(access_token: str) -> None:
    """Revoke a Supabase session by signing out server-side.

    This invalidates the access token immediately so it cannot be replayed
    even if intercepted. Should be called from the /logout endpoint.
    """
    _require_supabase_config()
    url = f"{settings.SUPABASE_URL}/auth/v1/logout"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, headers=headers)

    if resp.status_code >= 400:
        logger.warning("Supabase logout call failed [%d]: %s", resp.status_code, resp.text)
        raise SupabaseAuthError("Sign-out failed on the authentication service", status_code=502)


async def upsert_profile_from_user(user: dict[str, Any]) -> dict[str, Any]:
    """Create or update a profile row from Supabase auth user data."""
    user_id = user.get("id")
    email = user.get("email")
    metadata = user.get("user_metadata") or {}
    now_iso = datetime.now(timezone.utc).isoformat()

    if not user_id or not email:
        raise SupabaseAuthError("User payload is missing required fields", status_code=500)

    profile_row = {
        "user_id": user_id,
        "email": email,
        "full_name": metadata.get("full_name") or metadata.get("name") or email.split("@")[0],
        "avatar_url": metadata.get("avatar_url") or metadata.get("picture"),
        "role": "student",
        "is_active": True,
        "onboarding_completed": False,
        "onboarding_data": {},
        "updated_at": now_iso,
        "last_login_at": now_iso,
    }

    url = f"{settings.SUPABASE_URL}/rest/v1/profiles?on_conflict=user_id"
    headers = {
        **_service_headers(),
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, json=[profile_row], headers=headers)

    if resp.status_code >= 400:
        logger.error("Supabase profile upsert failed [%d]: %s", resp.status_code, resp.text)
        raise SupabaseAuthError(
            "Failed to create or update user profile",
            status_code=resp.status_code,
        )

    rows = resp.json() or []
    return rows[0] if rows else profile_row


async def get_profile(user_id: str) -> dict[str, Any] | None:
    url = f"{settings.SUPABASE_URL}/rest/v1/profiles"
    headers = _service_headers()
    params = {"user_id": f"eq.{user_id}", "select": "*", "limit": "1"}

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url, headers=headers, params=params)

    if resp.status_code >= 400:
        logger.error("Supabase profile query failed [%d]: %s", resp.status_code, resp.text)
        raise SupabaseAuthError("Failed to fetch user profile", status_code=resp.status_code)

    rows = resp.json() or []
    return rows[0] if rows else None


async def update_profile(user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    url = f"{settings.SUPABASE_URL}/rest/v1/profiles"
    headers = {
        **_service_headers(),
        "Prefer": "return=representation",
    }

    body = {
        **updates,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    params = {"user_id": f"eq.{user_id}", "select": "*"}
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.patch(url, headers=headers, params=params, json=body)

    if resp.status_code >= 400:
        logger.error("Supabase profile update failed [%d]: %s", resp.status_code, resp.text)
        raise SupabaseAuthError("Failed to update user profile", status_code=resp.status_code)

    rows = resp.json() or []
    if not rows:
        raise SupabaseAuthError("Profile update returned no data", status_code=500)
    return rows[0]
