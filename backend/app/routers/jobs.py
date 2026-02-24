from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.models.job import JobCreate, JobPublic
from app.services.auth import get_current_user, get_current_recruiter

router = APIRouter()


def serialize_job(j: dict) -> JobPublic:
    j["_id"] = str(j["_id"])
    return JobPublic(
        id=j["_id"],
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
    current_user=Depends(get_current_recruiter),
):
    db = get_db()
    doc = {
        **job_data.model_dump(),
        "recruiter_id": current_user["_id"],
        "status": "active",
        "posted_at": datetime.utcnow(),
    }
    result = await db.jobs.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return serialize_job(doc)


@router.get("/list", response_model=list[JobPublic])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    _=Depends(get_current_user),
):
    db = get_db()
    cursor = db.jobs.find({"status": "active"}).skip(skip).limit(limit).sort("posted_at", -1)
    return [serialize_job(j) async for j in cursor]


@router.get("/{job_id}", response_model=JobPublic)
async def get_job(job_id: str, _=Depends(get_current_user)):
    db = get_db()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    j = await db.jobs.find_one({"_id": obj_id})
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize_job(j)


@router.put("/{job_id}", response_model=JobPublic)
async def update_job(
    job_id: str,
    job_data: JobCreate,
    current_user=Depends(get_current_recruiter),
):
    db = get_db()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    result = await db.jobs.find_one_and_update(
        {"_id": obj_id, "recruiter_id": current_user["_id"]},
        {"$set": job_data.model_dump()},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Job not found or unauthorized")
    return serialize_job(result)


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, current_user=Depends(get_current_recruiter)):
    db = get_db()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    result = await db.jobs.update_one(
        {"_id": obj_id, "recruiter_id": current_user["_id"]},
        {"$set": {"status": "deleted"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found or unauthorized")
