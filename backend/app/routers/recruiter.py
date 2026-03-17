from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services.auth import get_current_onboarded_recruiter
from app.services.supabase_db import (
    SupabaseDBError,
    get_job,
    list_ats_scores_for_job,
)

router = APIRouter()


class CandidateScoreItem(BaseModel):
    score_id: str
    resume_id: str
    overall_score: float
    created_at: datetime


@router.get("/candidates/{job_id}", response_model=list[CandidateScoreItem])
async def get_job_candidates(
    job_id: str,
    current_user=Depends(get_current_onboarded_recruiter),
):
    """Return ATS scores for candidates associated with a recruiter's job."""
    try:
        job = await get_job(job_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.get("recruiter_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized job access")

    try:
        rows = await list_ats_scores_for_job(job_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    candidates: list[CandidateScoreItem] = []
    for doc in rows:
        candidates.append(
            CandidateScoreItem(
                score_id=doc["id"],
                resume_id=doc["resume_id"],
                overall_score=doc.get("overall_score", 0),
                created_at=doc["created_at"],
            )
        )

    return candidates
