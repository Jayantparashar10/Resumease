from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx

from app.config import settings


class SupabaseAuthError(Exception):
    """Raised when Supabase auth or profile calls fail."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def _require_supabase_config() -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise SupabaseAuthError("Supabase URL/Anon key is not configured", status_code=500)

    parsed = urlparse(settings.SUPABASE_URL)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SupabaseAuthError(
            "SUPABASE_URL is invalid. Expected format: https://<project-ref>.supabase.co",
            status_code=500,
        )


def _connect_error_message() -> str:
    return (
        "Could not connect to Supabase. Check SUPABASE_URL and DNS/network reachability "
        f"for '{settings.SUPABASE_URL}'."
    )


def _service_headers() -> dict[str, str]:
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseAuthError("SUPABASE_SERVICE_ROLE_KEY is not configured", status_code=500)
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

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, json=payload, headers=_anon_headers())
    except httpx.ConnectError as exc:
        raise SupabaseAuthError(_connect_error_message(), status_code=503) from exc
    except httpx.HTTPError as exc:
        raise SupabaseAuthError(f"Supabase request failed: {exc}", status_code=503) from exc

    if resp.status_code >= 400:
        raise SupabaseAuthError(
            f"Supabase token exchange failed: {resp.text}",
            status_code=resp.status_code,
        )

    data = resp.json()
    if not data.get("access_token") or not data.get("user"):
        raise SupabaseAuthError("Supabase token exchange returned incomplete payload")

    return data


def _extract_provider_from_user(user: dict[str, Any]) -> str | None:
    identities = user.get("identities") or []
    providers: list[str] = []
    for identity in identities:
        provider = identity.get("provider")
        if provider:
            providers.append(str(provider).lower())

    if not providers:
        return None
    if "google" in providers:
        return "google"
    if "email" in providers:
        return "email"
    return providers[0]


async def _find_auth_user_by_email(email: str) -> dict[str, Any] | None:
    """Best-effort lookup of an auth user by email via Supabase admin API."""
    normalized = email.strip().lower()
    if not normalized:
        return None

    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = _service_headers()
    page = 1
    per_page = 200

    while page <= 10:
        params = {"page": str(page), "per_page": str(per_page)}
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(url, headers=headers, params=params)
        except httpx.ConnectError as exc:
            raise SupabaseAuthError(_connect_error_message(), status_code=503) from exc
        except httpx.HTTPError as exc:
            raise SupabaseAuthError(f"Supabase request failed: {exc}", status_code=503) from exc

        if resp.status_code >= 400:
            raise SupabaseAuthError(
                f"Supabase admin user lookup failed: {resp.text}",
                status_code=resp.status_code,
            )

        payload = resp.json() or {}
        users = payload.get("users") or []
        for user in users:
            if str(user.get("email", "")).strip().lower() == normalized:
                return user

        if len(users) < per_page:
            break
        page += 1

    return None


async def sign_up_with_email_password(
    email: str,
    password: str,
    full_name: str,
) -> dict[str, Any]:
    """Create an auth account with email/password and return a session payload."""
    _require_supabase_config()

    existing_user = await _find_auth_user_by_email(email)
    if existing_user:
        provider = _extract_provider_from_user(existing_user)
        if provider == "google":
            raise SupabaseAuthError(
                "Account already exists with Google for this email. Please continue with Google sign-in.",
                status_code=409,
            )
        raise SupabaseAuthError(
            "Account already exists with this email. Please sign in instead.",
            status_code=409,
        )

    url = f"{settings.SUPABASE_URL}/auth/v1/signup"
    payload = {
        "email": email.strip().lower(),
        "password": password,
        "data": {"full_name": full_name},
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, json=payload, headers=_anon_headers())
    except httpx.ConnectError as exc:
        raise SupabaseAuthError(_connect_error_message(), status_code=503) from exc
    except httpx.HTTPError as exc:
        raise SupabaseAuthError(f"Supabase request failed: {exc}", status_code=503) from exc

    if resp.status_code >= 400:
        message = resp.text.lower()
        if "already" in message or "registered" in message or "exists" in message:
            raise SupabaseAuthError(
                "Account already exists with this email. Use your existing sign-in method.",
                status_code=409,
            )
        raise SupabaseAuthError(
            f"Supabase signup failed: {resp.text}",
            status_code=resp.status_code,
        )

    data = resp.json() or {}
    if data.get("access_token") and data.get("user"):
        return data

    # If signup does not return a session (e.g. email confirmation flow), try password login.
    return await sign_in_with_email_password(email=email, password=password)


async def sign_in_with_email_password(email: str, password: str) -> dict[str, Any]:
    """Sign in with email/password and return Supabase session payload."""
    _require_supabase_config()

    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    payload = {
        "email": email.strip().lower(),
        "password": password,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, json=payload, headers=_anon_headers())
    except httpx.ConnectError as exc:
        raise SupabaseAuthError(_connect_error_message(), status_code=503) from exc
    except httpx.HTTPError as exc:
        raise SupabaseAuthError(f"Supabase request failed: {exc}", status_code=503) from exc

    if resp.status_code >= 400:
        existing_user = await _find_auth_user_by_email(email)
        if existing_user:
            provider = _extract_provider_from_user(existing_user)
            if provider == "google":
                raise SupabaseAuthError(
                    "This email is registered with Google sign-in. Please continue with Google.",
                    status_code=409,
                )
            raise SupabaseAuthError("Invalid email or password", status_code=401)

        raise SupabaseAuthError("No account found for this email. Please sign up first.", status_code=404)

    data = resp.json() or {}
    if not data.get("access_token") or not data.get("user"):
        raise SupabaseAuthError("Supabase login returned incomplete payload", status_code=500)
    return data


async def get_user_from_access_token(access_token: str) -> dict[str, Any]:
    """Resolve Supabase user from access token."""
    _require_supabase_config()
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, headers=headers)
    except httpx.ConnectError as exc:
        raise SupabaseAuthError(_connect_error_message(), status_code=503) from exc
    except httpx.HTTPError as exc:
        raise SupabaseAuthError(f"Supabase request failed: {exc}", status_code=503) from exc

    if resp.status_code >= 400:
        raise SupabaseAuthError("Invalid or expired Supabase access token", status_code=401)

    return resp.json()


async def upsert_profile_from_user(user: dict[str, Any]) -> dict[str, Any]:
    """Create or update a profile row from Supabase auth user data."""
    user_id = user.get("id")
    email = user.get("email")
    metadata = user.get("user_metadata") or {}
    now_iso = datetime.now(timezone.utc).isoformat()

    if not user_id or not email:
        raise SupabaseAuthError("Supabase user payload missing id/email", status_code=500)

    existing_profile = await get_profile(user_id)

    profile_row = {
        "user_id": user_id,
        "email": email,
        "full_name": (
            (existing_profile or {}).get("full_name")
            or metadata.get("full_name")
            or metadata.get("name")
            or email.split("@")[0]
        ),
        "avatar_url": (
            metadata.get("avatar_url")
            or metadata.get("picture")
            or (existing_profile or {}).get("avatar_url")
        ),
        "role": (existing_profile or {}).get("role", "student"),
        "is_active": True,
        "onboarding_completed": (existing_profile or {}).get("onboarding_completed", False),
        "onboarding_data": (existing_profile or {}).get("onboarding_data", {}),
        "updated_at": now_iso,
        "last_login_at": now_iso,
    }

    url = f"{settings.SUPABASE_URL}/rest/v1/profiles?on_conflict=user_id"
    headers = {
        **_service_headers(),
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, json=[profile_row], headers=headers)
    except httpx.ConnectError as exc:
        raise SupabaseAuthError(_connect_error_message(), status_code=503) from exc
    except httpx.HTTPError as exc:
        raise SupabaseAuthError(f"Supabase request failed: {exc}", status_code=503) from exc

    if resp.status_code >= 400:
        raise SupabaseAuthError(
            f"Supabase profile upsert failed: {resp.text}",
            status_code=resp.status_code,
        )

    rows = resp.json() or []
    return rows[0] if rows else profile_row


async def get_profile(user_id: str) -> dict[str, Any] | None:
    url = f"{settings.SUPABASE_URL}/rest/v1/profiles"
    headers = _service_headers()
    params = {"user_id": f"eq.{user_id}", "select": "*", "limit": "1"}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, headers=headers, params=params)
    except httpx.ConnectError as exc:
        raise SupabaseAuthError(_connect_error_message(), status_code=503) from exc
    except httpx.HTTPError as exc:
        raise SupabaseAuthError(f"Supabase request failed: {exc}", status_code=503) from exc

    if resp.status_code >= 400:
        raise SupabaseAuthError(
            f"Supabase profile query failed: {resp.text}",
            status_code=resp.status_code,
        )

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
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.patch(url, headers=headers, params=params, json=body)
    except httpx.ConnectError as exc:
        raise SupabaseAuthError(_connect_error_message(), status_code=503) from exc
    except httpx.HTTPError as exc:
        raise SupabaseAuthError(f"Supabase request failed: {exc}", status_code=503) from exc

    if resp.status_code >= 400:
        raise SupabaseAuthError(
            f"Supabase profile update failed: {resp.text}",
            status_code=resp.status_code,
        )

    rows = resp.json() or []
    if not rows:
        raise SupabaseAuthError("Supabase profile update returned no row", status_code=500)
    return rows[0]
