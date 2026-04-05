from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services.auth import get_current_onboarded_recruiter
from app.services.supabase_db import (
    SupabaseDBError,
    get_ats_score,
    get_job,
    get_profile_by_user_id,
    get_resume,
    list_ats_scores_for_job,
)

router = APIRouter()


class CandidateScoreItem(BaseModel):
    score_id: str
    resume_id: str
    overall_score: float
    created_at: datetime


class CandidateProfileItem(BaseModel):
    score_id: str
    resume_id: str
    candidate_id: str
    candidate_name: str
    candidate_email: Optional[str] = None
    resume_filename: str
    overall_score: float
    breakdown: dict[str, Any] = {}
    feedback: dict[str, Any] = {}
    suggestions: list[str] = []
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    github_url: Optional[str] = None
    github_score: Optional[float] = None
    portfolio_url: Optional[str] = None
    portfolio_score: Optional[float] = None
    created_at: datetime


class CandidateProfileDetail(CandidateProfileItem):
    resume_skills: list[str] = []
    resume_parsed_text: Optional[str] = None
    extracted_links: dict[str, Any] = {}
    link_analysis: dict[str, Any] = {}
    resume_api_url: str


class CandidateResumeView(BaseModel):
    resume_id: str
    filename: str
    parsed_text: Optional[str] = None
    skills: list[str] = []
    extracted_links: dict[str, Any] = {}
    link_analysis: dict[str, Any] = {}


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


@router.get("/candidates/{job_id}/profiles", response_model=list[CandidateProfileItem])
async def get_job_candidate_profiles(
    job_id: str,
    current_user=Depends(get_current_onboarded_recruiter),
):
    """Return enriched candidate profiles + ATS analysis for a recruiter's job."""
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

    profiles: list[CandidateProfileItem] = []
    for doc in rows:
        try:
            resume = await get_resume(doc["resume_id"])
        except SupabaseDBError:
            resume = None

        if not resume:
            continue

        candidate_id = resume.get("user_id")
        try:
            profile = await get_profile_by_user_id(candidate_id)
        except SupabaseDBError:
            profile = None

        extracted_links = resume.get("extracted_links", {}) or {}
        link_analysis = resume.get("link_analysis", {}) or {}
        github_data = link_analysis.get("github") or {}
        portfolio_data = link_analysis.get("portfolio") or {}

        profiles.append(
            CandidateProfileItem(
                score_id=doc["id"],
                resume_id=doc["resume_id"],
                candidate_id=candidate_id,
                candidate_name=(profile or {}).get("full_name", "Unknown Candidate"),
                candidate_email=(profile or {}).get("email"),
                resume_filename=resume.get("filename", "resume"),
                overall_score=doc.get("overall_score", 0),
                breakdown=doc.get("breakdown", {}),
                feedback=doc.get("feedback", {}),
                suggestions=doc.get("suggestions", []),
                matched_skills=doc.get("matched_skills", []),
                missing_skills=doc.get("missing_skills", []),
                github_url=extracted_links.get("github"),
                github_score=github_data.get("github_score"),
                portfolio_url=extracted_links.get("portfolio"),
                portfolio_score=portfolio_data.get("portfolio_score"),
                created_at=doc["created_at"],
            )
        )

    return profiles


@router.get("/candidates/{job_id}/profiles/{score_id}", response_model=CandidateProfileDetail)
async def get_job_candidate_profile_detail(
    job_id: str,
    score_id: str,
    current_user=Depends(get_current_onboarded_recruiter),
):
    """Return one candidate's profile overview and resume metadata for recruiter review."""
    try:
        job = await get_job(job_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.get("recruiter_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized job access")

    try:
        score_doc = await get_ats_score(score_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not score_doc:
        raise HTTPException(status_code=404, detail="Candidate score not found")

    if score_doc.get("job_id") != job_id:
        raise HTTPException(status_code=404, detail="Candidate score does not belong to this job")

    try:
        resume = await get_resume(score_doc["resume_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    candidate_id = resume.get("user_id")
    try:
        profile = await get_profile_by_user_id(candidate_id)
    except SupabaseDBError:
        profile = None

    extracted_links = resume.get("extracted_links", {}) or {}
    link_analysis = resume.get("link_analysis", {}) or {}
    github_data = link_analysis.get("github") or {}
    portfolio_data = link_analysis.get("portfolio") or {}

    return CandidateProfileDetail(
        score_id=score_doc["id"],
        resume_id=score_doc["resume_id"],
        candidate_id=candidate_id or "unknown",
        candidate_name=(profile or {}).get("full_name", "Unknown Candidate"),
        candidate_email=(profile or {}).get("email"),
        resume_filename=resume.get("filename", "resume"),
        overall_score=score_doc.get("overall_score", 0),
        breakdown=score_doc.get("breakdown", {}),
        feedback=score_doc.get("feedback", {}),
        suggestions=score_doc.get("suggestions", []),
        matched_skills=score_doc.get("matched_skills", []),
        missing_skills=score_doc.get("missing_skills", []),
        github_url=extracted_links.get("github"),
        github_score=github_data.get("github_score"),
        portfolio_url=extracted_links.get("portfolio"),
        portfolio_score=portfolio_data.get("portfolio_score"),
        created_at=score_doc["created_at"],
        resume_skills=resume.get("skills", []),
        resume_parsed_text=resume.get("parsed_text"),
        extracted_links=extracted_links,
        link_analysis=link_analysis,
        resume_api_url=f"/api/v1/recruiter/candidates/{job_id}/profiles/{score_id}/resume",
    )


@router.get("/candidates/{job_id}/profiles/{score_id}/resume", response_model=CandidateResumeView)
async def get_job_candidate_resume(
    job_id: str,
    score_id: str,
    current_user=Depends(get_current_onboarded_recruiter),
):
    """Return resume payload for one candidate score so recruiter can open/download the resume data."""
    try:
        job = await get_job(job_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.get("recruiter_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized job access")

    try:
        score_doc = await get_ats_score(score_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not score_doc or score_doc.get("job_id") != job_id:
        raise HTTPException(status_code=404, detail="Candidate score not found")

    try:
        resume = await get_resume(score_doc["resume_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    return CandidateResumeView(
        resume_id=resume.get("id"),
        filename=resume.get("filename", "resume"),
        parsed_text=resume.get("parsed_text"),
        skills=resume.get("skills", []),
        extracted_links=resume.get("extracted_links", {}),
        link_analysis=resume.get("link_analysis", {}),
    )
