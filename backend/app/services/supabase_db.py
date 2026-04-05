from datetime import datetime
from typing import Any

import httpx
import logging

logger = logging.getLogger(__name__)

from app.config import settings


class SupabaseDBError(Exception):
    """Raised when Supabase REST database calls fail."""


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

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.request(
            method,
            url,
            params=params,
            json=json_data,
            headers=_headers(prefer),
        )

    if resp.status_code >= 400:
        logger.error("Supabase %s %s failed [%d]: %s", table, method, resp.status_code, resp.text)
        raise SupabaseDBError(f"Database operation failed")

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
    select = "*" if include_parsed_text else "id,user_id,filename,file_size,extracted_links,skills,status,parser_version,screening_summary,uploaded_at"
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
        "select": "id,resume_id,overall_score,created_at",
        "order": "created_at.desc",
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
