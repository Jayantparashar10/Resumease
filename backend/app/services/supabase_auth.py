from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings


class SupabaseAuthError(Exception):
    """Raised when Supabase auth or profile calls fail."""


def _require_supabase_config() -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise SupabaseAuthError("Supabase URL/Anon key is not configured")


def _service_headers() -> dict[str, str]:
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseAuthError("SUPABASE_SERVICE_ROLE_KEY is not configured")
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
        raise SupabaseAuthError(f"Supabase token exchange failed: {resp.text}")

    data = resp.json()
    if not data.get("access_token") or not data.get("user"):
        raise SupabaseAuthError("Supabase token exchange returned incomplete payload")

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
        raise SupabaseAuthError("Invalid or expired Supabase access token")

    return resp.json()


async def upsert_profile_from_user(user: dict[str, Any]) -> dict[str, Any]:
    """Create or update a profile row from Supabase auth user data."""
    user_id = user.get("id")
    email = user.get("email")
    metadata = user.get("user_metadata") or {}
    now_iso = datetime.now(timezone.utc).isoformat()

    if not user_id or not email:
        raise SupabaseAuthError("Supabase user payload missing id/email")

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
        raise SupabaseAuthError(f"Supabase profile upsert failed: {resp.text}")

    rows = resp.json() or []
    return rows[0] if rows else profile_row


async def get_profile(user_id: str) -> dict[str, Any] | None:
    url = f"{settings.SUPABASE_URL}/rest/v1/profiles"
    headers = _service_headers()
    params = {"user_id": f"eq.{user_id}", "select": "*", "limit": "1"}

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url, headers=headers, params=params)

    if resp.status_code >= 400:
        raise SupabaseAuthError(f"Supabase profile query failed: {resp.text}")

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
        raise SupabaseAuthError(f"Supabase profile update failed: {resp.text}")

    rows = resp.json() or []
    if not rows:
        raise SupabaseAuthError("Supabase profile update returned no row")
    return rows[0]
