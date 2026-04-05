from datetime import datetime
from typing import Any
import asyncio
from urllib.parse import quote

import httpx

from app.config import settings


class SupabaseDBError(Exception):
    """Raised when Supabase REST database calls fail."""


RESUME_STORAGE_BUCKET = "resumes"
_resume_bucket_checked = False


def _headers(prefer: str | None = None) -> dict[str, str]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseDBError("Supabase database config is missing")

    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in payload.items():
        if isinstance(value, datetime):
            normalized[key] = value.isoformat()
        else:
            normalized[key] = value
    return normalized


def _storage_object_url(object_path: str) -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    encoded = quote(object_path, safe="/")
    return f"{base}/storage/v1/object/{RESUME_STORAGE_BUCKET}/{encoded}"


def _storage_signed_url_endpoint(object_path: str) -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    encoded = quote(object_path, safe="/")
    return f"{base}/storage/v1/object/sign/{RESUME_STORAGE_BUCKET}/{encoded}"


def _storage_bucket_url() -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/bucket/{RESUME_STORAGE_BUCKET}"


def _storage_buckets_url() -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/bucket"


def _is_not_found_bucket_response(resp: httpx.Response) -> bool:
    if resp.status_code == 404:
        return True
    try:
        payload = resp.json()
    except Exception:
        payload = {}
    status_code = str(payload.get("statusCode", "")).strip()
    message = str(payload.get("message", "")).lower()
    error = str(payload.get("error", "")).lower()
    return status_code == "404" or "bucket not found" in message or "bucket not found" in error


async def _request(
    method: str,
    table: str,
    *,
    params: dict[str, str] | None = None,
    json_data: Any = None,
    prefer: str | None = None,
) -> Any:
    base = settings.SUPABASE_URL.rstrip("/")
    url = f"{base}/rest/v1/{table}"
    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30, verify=True) as client:
                resp = await client.request(
                    method,
                    url,
                    params=params,
                    json=json_data,
                    headers=_headers(prefer),
                )

            if resp.status_code >= 400:
                raise SupabaseDBError(f"Supabase {table} {method} failed: {resp.text}")

            return resp.json() if resp.text else None

        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_error = exc
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # exponential backoff: 1s, 2s, 4s
                await asyncio.sleep(wait_time)
                continue
            else:
                raise SupabaseDBError(
                    f"Supabase {table} connection failed after {max_retries} attempts: {type(exc).__name__}: {str(exc)}"
                ) from exc
        except httpx.HTTPError as exc:
            raise SupabaseDBError(f"Supabase {table} request failed: {str(exc)}") from exc

    if last_error:
        raise SupabaseDBError(f"Supabase {table} failed: {str(last_error)}") from last_error

    if not resp.text:
        return None
    return resp.json()


async def insert_resume(doc: dict[str, Any]) -> dict[str, Any]:
    rows = await _request(
        "POST",
        "resumes",
        json_data=[_normalize_payload(doc)],
        prefer="return=representation",
    )
    return rows[0]


async def list_resumes_for_user(user_id: str, include_parsed_text: bool = False) -> list[dict[str, Any]]:
    select = "*" if include_parsed_text else "id,user_id,filename,file_size,extracted_links,skills,status,parser_version,screening_summary,link_analysis,latex_source,latex_updated_at,uploaded_at"
    params = {
        "user_id": f"eq.{user_id}",
        "select": select,
        "order": "uploaded_at.desc",
    }
    return await _request("GET", "resumes", params=params)


async def get_resume_for_user(resume_id: str, user_id: str) -> dict[str, Any] | None:
    params = {
        "id": f"eq.{resume_id}",
        "user_id": f"eq.{user_id}",
        "select": "*",
        "limit": "1",
    }
    rows = await _request("GET", "resumes", params=params)
    return rows[0] if rows else None


async def get_resume(resume_id: str) -> dict[str, Any] | None:
    params = {
        "id": f"eq.{resume_id}",
        "select": "*",
        "limit": "1",
    }
    rows = await _request("GET", "resumes", params=params)
    return rows[0] if rows else None


async def get_profile_by_user_id(user_id: str) -> dict[str, Any] | None:
    params = {
        "user_id": f"eq.{user_id}",
        "select": "user_id,email,full_name,avatar_url,role,onboarding_completed,is_active",
        "limit": "1",
    }
    rows = await _request("GET", "profiles", params=params)
    return rows[0] if rows else None


async def delete_resume_for_user(resume_id: str, user_id: str) -> bool:
    params = {
        "id": f"eq.{resume_id}",
        "user_id": f"eq.{user_id}",
        "select": "id",
    }
    rows = await _request(
        "DELETE",
        "resumes",
        params=params,
        prefer="return=representation",
    )
    return bool(rows)


async def update_resume(resume_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    params = {
        "id": f"eq.{resume_id}",
        "select": "*",
    }
    rows = await _request(
        "PATCH",
        "resumes",
        params=params,
        json_data=_normalize_payload(updates),
        prefer="return=representation",
    )
    return rows[0] if rows else None


async def update_resume_for_user(resume_id: str, user_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    params = {
        "id": f"eq.{resume_id}",
        "user_id": f"eq.{user_id}",
        "select": "*",
    }
    rows = await _request(
        "PATCH",
        "resumes",
        params=params,
        json_data=_normalize_payload(updates),
        prefer="return=representation",
    )
    return rows[0] if rows else None


async def create_job(doc: dict[str, Any]) -> dict[str, Any]:
    rows = await _request(
        "POST",
        "jobs",
        json_data=[_normalize_payload(doc)],
        prefer="return=representation",
    )
    return rows[0]


async def list_jobs(skip: int, limit: int) -> list[dict[str, Any]]:
    params = {
        "status": "eq.active",
        "select": "*",
        "order": "posted_at.desc",
        "offset": str(skip),
        "limit": str(limit),
    }
    return await _request("GET", "jobs", params=params)


async def get_job(job_id: str) -> dict[str, Any] | None:
    params = {
        "id": f"eq.{job_id}",
        "select": "*",
        "limit": "1",
    }
    rows = await _request("GET", "jobs", params=params)
    return rows[0] if rows else None


async def update_job_for_recruiter(job_id: str, recruiter_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    params = {
        "id": f"eq.{job_id}",
        "recruiter_id": f"eq.{recruiter_id}",
        "select": "*",
    }
    rows = await _request(
        "PATCH",
        "jobs",
        params=params,
        json_data=_normalize_payload(updates),
        prefer="return=representation",
    )
    return rows[0] if rows else None


async def soft_delete_job_for_recruiter(job_id: str, recruiter_id: str) -> bool:
    params = {
        "id": f"eq.{job_id}",
        "recruiter_id": f"eq.{recruiter_id}",
        "select": "id",
    }
    rows = await _request(
        "PATCH",
        "jobs",
        params=params,
        json_data={"status": "deleted"},
        prefer="return=representation",
    )
    return bool(rows)


async def get_cached_ats_score(resume_id: str, job_id: str) -> dict[str, Any] | None:
    params = {
        "resume_id": f"eq.{resume_id}",
        "job_id": f"eq.{job_id}",
        "select": "*",
        "order": "created_at.desc",
        "limit": "1",
    }
    rows = await _request("GET", "ats_scores", params=params)
    return rows[0] if rows else None


async def insert_ats_score(doc: dict[str, Any]) -> dict[str, Any]:
    rows = await _request(
        "POST",
        "ats_scores",
        json_data=[_normalize_payload(doc)],
        prefer="return=representation",
    )
    return rows[0]


async def get_ats_score(score_id: str) -> dict[str, Any] | None:
    params = {
        "id": f"eq.{score_id}",
        "select": "*",
        "limit": "1",
    }
    rows = await _request("GET", "ats_scores", params=params)
    return rows[0] if rows else None


async def list_ats_scores_for_user(user_id: str) -> list[dict[str, Any]]:
    # Build via join-like two-step to keep API straightforward.
    resumes = await list_resumes_for_user(user_id=user_id, include_parsed_text=False)
    resume_ids = [r.get("id") for r in resumes if r.get("id")]
    if not resume_ids:
        return []

    joined = ",".join(resume_ids)
    params = {
        "resume_id": f"in.({joined})",
        "select": "id,resume_id,job_id,overall_score,created_at",
        "order": "created_at.desc",
    }
    return await _request("GET", "ats_scores", params=params)


async def list_ats_scores_for_job(job_id: str) -> list[dict[str, Any]]:
    params = {
        "job_id": f"eq.{job_id}",
        "select": "id,resume_id,overall_score,breakdown,feedback,suggestions,matched_skills,missing_skills,created_at",
        "order": "overall_score.desc,created_at.desc",
    }
    return await _request("GET", "ats_scores", params=params)


async def get_github_analysis(username: str) -> dict[str, Any] | None:
    params = {
        "username": f"eq.{username}",
        "select": "*",
        "limit": "1",
    }
    rows = await _request("GET", "github_analysis", params=params)
    return rows[0] if rows else None


async def upsert_github_analysis(row: dict[str, Any]) -> dict[str, Any]:
    rows = await _request(
        "POST",
        "github_analysis",
        json_data=[_normalize_payload(row)],
        prefer="resolution=merge-duplicates,return=representation",
    )
    return rows[0]


async def get_portfolio_analysis(url: str) -> dict[str, Any] | None:
    params = {
        "url": f"eq.{url}",
        "select": "*",
        "limit": "1",
    }
    rows = await _request("GET", "portfolio_analysis", params=params)
    return rows[0] if rows else None


async def upsert_portfolio_analysis(row: dict[str, Any]) -> dict[str, Any]:
    rows = await _request(
        "POST",
        "portfolio_analysis",
        json_data=[_normalize_payload(row)],
        prefer="resolution=merge-duplicates,return=representation",
    )
    return rows[0]


async def upload_resume_file(
    *,
    object_path: str,
    content: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a resume binary to Supabase Storage and return the stored object path."""
    await ensure_resume_storage_bucket()

    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            headers = _headers()
            headers["Content-Type"] = content_type
            headers["x-upsert"] = "true"

            async with httpx.AsyncClient(timeout=30, verify=True) as client:
                resp = await client.post(
                    _storage_object_url(object_path),
                    content=content,
                    headers=headers,
                )

            if resp.status_code >= 400:
                raise SupabaseDBError(f"Supabase storage upload failed: {resp.text}")

            return object_path
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_error = exc
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
                continue
            raise SupabaseDBError(
                f"Supabase storage upload failed after {max_retries} attempts: {type(exc).__name__}: {str(exc)}"
            ) from exc
        except httpx.HTTPError as exc:
            raise SupabaseDBError(f"Supabase storage upload request failed: {str(exc)}") from exc

    if last_error:
        raise SupabaseDBError(f"Supabase storage upload failed: {str(last_error)}") from last_error

    raise SupabaseDBError("Supabase storage upload failed")


async def ensure_resume_storage_bucket() -> None:
    """Ensure the private resume storage bucket exists (idempotent)."""
    global _resume_bucket_checked
    if _resume_bucket_checked:
        return

    try:
        async with httpx.AsyncClient(timeout=30, verify=True) as client:
            list_resp = await client.get(_storage_buckets_url(), headers=_headers())
    except httpx.HTTPError as exc:
        raise SupabaseDBError(f"Supabase bucket check failed: {str(exc)}") from exc

    if list_resp.status_code >= 400:
        raise SupabaseDBError(f"Supabase bucket list failed: {list_resp.text}")

    buckets = list_resp.json() if list_resp.text else []
    if isinstance(buckets, list):
        for bucket in buckets:
            if str(bucket.get("id", "")) == RESUME_STORAGE_BUCKET or str(bucket.get("name", "")) == RESUME_STORAGE_BUCKET:
                _resume_bucket_checked = True
                return

    # Fallback: some deployments may block list and require bucket-by-id probe.
    try:
        async with httpx.AsyncClient(timeout=30, verify=True) as client:
            probe_resp = await client.get(_storage_bucket_url(), headers=_headers())
    except httpx.HTTPError as exc:
        raise SupabaseDBError(f"Supabase bucket check failed: {str(exc)}") from exc

    if probe_resp.status_code == 200:
        _resume_bucket_checked = True
        return

    if not _is_not_found_bucket_response(probe_resp):
        raise SupabaseDBError(f"Supabase bucket check failed: {probe_resp.text}")

    payload = {
        "id": RESUME_STORAGE_BUCKET,
        "name": RESUME_STORAGE_BUCKET,
        "public": False,
    }
    try:
        async with httpx.AsyncClient(timeout=30, verify=True) as client:
            create_resp = await client.post(_storage_buckets_url(), json=payload, headers=_headers())
    except httpx.HTTPError as exc:
        raise SupabaseDBError(f"Supabase bucket create failed: {str(exc)}") from exc

    if create_resp.status_code in {200, 201}:
        _resume_bucket_checked = True
        return

    # Treat duplicate/create-race as success.
    if create_resp.status_code in {400, 409}:
        _resume_bucket_checked = True
        return

    raise SupabaseDBError(f"Supabase bucket create failed: {create_resp.text}")


async def create_resume_file_signed_url(object_path: str, expires_in: int = 900) -> str:
    """Generate a short-lived signed URL for a private resume object."""
    try:
        async with httpx.AsyncClient(timeout=30, verify=True) as client:
            resp = await client.post(
                _storage_signed_url_endpoint(object_path),
                json={"expiresIn": expires_in},
                headers=_headers(),
            )
    except httpx.HTTPError as exc:
        raise SupabaseDBError(f"Supabase signed URL request failed: {str(exc)}") from exc

    if resp.status_code >= 400:
        raise SupabaseDBError(f"Supabase signed URL creation failed: {resp.text}")

    payload = resp.json() if resp.text else {}
    signed_path = payload.get("signedURL") or payload.get("signedUrl")
    if not signed_path:
        raise SupabaseDBError("Supabase signed URL creation failed: missing signed URL in response")

    if str(signed_path).startswith("http://") or str(signed_path).startswith("https://"):
        return str(signed_path)

    base = settings.SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1{signed_path}"


async def delete_resume_file(object_path: str) -> None:
    """Delete a stored resume object. Missing objects are treated as no-op."""
    if not object_path:
        return

    try:
        async with httpx.AsyncClient(timeout=30, verify=True) as client:
            resp = await client.delete(_storage_object_url(object_path), headers=_headers())
    except httpx.HTTPError as exc:
        raise SupabaseDBError(f"Supabase storage delete request failed: {str(exc)}") from exc

    if resp.status_code in {200, 204, 404}:
        return

    raise SupabaseDBError(f"Supabase storage delete failed: {resp.text}")
