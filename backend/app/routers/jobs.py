from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone

from app.models.job import JobCreate, JobPublic
from app.services.auth import (
    get_current_onboarded_recruiter,
    get_current_onboarded_user,
)
from app.services.supabase_db import (
    SupabaseDBError,
    create_job as create_job_row,
    get_job as get_job_row,
    list_jobs as list_jobs_rows,
    soft_delete_job_for_recruiter,
    update_job_for_recruiter,
)

router = APIRouter()


def serialize_job(j: dict) -> JobPublic:
    return JobPublic(
        id=j["id"],
        title=j["title"],
        company=j["company"],
        description=j["description"],
        required_skills=j.get("required_skills", []),
        location=j.get("location"),
        experience_years=j.get("experience_years"),
        recruiter_id=j["recruiter_id"],
        status=j.get("status", "active"),
        posted_at=j["posted_at"],
    )


@router.post("/create", response_model=JobPublic, status_code=201)
async def create_job(
    job_data: JobCreate,
    current_user=Depends(get_current_onboarded_recruiter),
):
    doc = {
        **job_data.model_dump(),
        "recruiter_id": current_user["_id"],
        "status": "active",
        "posted_at": datetime.now(timezone.utc),
    }
    try:
        created = await create_job_row(doc)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return serialize_job(created)


@router.get("/list", response_model=list[JobPublic])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    _=Depends(get_current_onboarded_user),
):
    try:
        rows = await list_jobs_rows(skip=skip, limit=limit)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return [serialize_job(j) for j in rows]


@router.get("/{job_id}", response_model=JobPublic)
async def get_job(job_id: str, _=Depends(get_current_onboarded_user)):
    try:
        j = await get_job_row(job_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize_job(j)


@router.put("/{job_id}", response_model=JobPublic)
async def update_job(
    job_id: str,
    job_data: JobCreate,
    current_user=Depends(get_current_onboarded_recruiter),
):
    try:
        result = await update_job_for_recruiter(
            job_id,
            current_user["_id"],
            job_data.model_dump(),
        )
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not result:
        raise HTTPException(status_code=404, detail="Job not found or unauthorized")
    return serialize_job(result)


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, current_user=Depends(get_current_onboarded_recruiter)):
    try:
        deleted = await soft_delete_job_for_recruiter(job_id, current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found or unauthorized")
