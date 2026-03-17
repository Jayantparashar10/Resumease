from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone

from app.models.ats_score import ATSScorePublic, ScoreRequest
from app.services.auth import get_current_onboarded_student
from app.services.llm_service import score_resume_with_llm
from app.services.supabase_db import (
    SupabaseDBError,
    get_ats_score,
    get_cached_ats_score,
    get_job,
    get_resume_for_user,
    get_github_analysis,
    insert_ats_score,
    list_ats_scores_for_user,
)

router = APIRouter()


def _parse_dt(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return datetime.now(timezone.utc)


@router.post("/score", response_model=ATSScorePublic, status_code=201)
async def score_resume(
    request: ScoreRequest,
    current_user=Depends(get_current_onboarded_student),
):
    try:
        resume = await get_resume_for_user(request.resume_id, current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        job = await get_job(request.job_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        existing = await get_cached_ats_score(request.resume_id, request.job_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if existing:
        age = datetime.now(timezone.utc) - _parse_dt(existing.get("created_at"))
        if age < timedelta(days=7):
            return ATSScorePublic(
                id=existing["id"],
                resume_id=existing["resume_id"],
                job_id=existing["job_id"],
                overall_score=existing["overall_score"],
                breakdown=existing["breakdown"],
                feedback=existing.get("feedback", {}),
                suggestions=existing.get("suggestions", []),
                matched_skills=existing.get("matched_skills", []),
                missing_skills=existing.get("missing_skills", []),
                created_at=existing["created_at"],
            )

    # Get GitHub score for blended scoring
    github_score = None
    links = resume.get("extracted_links", {})
    gh_url = links.get("github")
    if gh_url:
        from app.services.link_extractor import extract_github_username
        username = extract_github_username(gh_url)
        if username:
            cached_gh = await get_github_analysis(username)
            if cached_gh:
                github_score = cached_gh.get("github_score")

    # Score with LLM
    llm_result = await score_resume_with_llm(
        resume_text=resume.get("parsed_text", ""),
        job_description=job.get("description", ""),
        required_skills=job.get("required_skills", []),
        github_score=github_score,
    )

    # Persist
    doc = {
        "resume_id": request.resume_id,
        "job_id": request.job_id,
        "overall_score": llm_result.get("overall_score", 0),
        "breakdown": llm_result.get("breakdown", {}),
        "feedback": llm_result.get("feedback", {}),
        "suggestions": llm_result.get("suggestions", []),
        "matched_skills": llm_result.get("matched_skills", []),
        "missing_skills": llm_result.get("missing_skills", []),
        "tokens_used": llm_result.get("tokens_used", 0),
        "estimated_cost": llm_result.get("estimated_cost", 0.0),
        "llm_provider": llm_result.get("llm_provider", "unknown"),
        "model_name": llm_result.get("model_name", "unknown"),
        "fallback_reason": llm_result.get("fallback_reason"),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        created = await insert_ats_score(doc)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ATSScorePublic(
        id=created["id"],
        resume_id=created["resume_id"],
        job_id=created["job_id"],
        overall_score=created["overall_score"],
        breakdown=created["breakdown"],
        feedback=created["feedback"],
        suggestions=created["suggestions"],
        matched_skills=created["matched_skills"],
        missing_skills=created["missing_skills"],
        created_at=created["created_at"],
    )


@router.get("/score/{score_id}", response_model=ATSScorePublic)
async def get_score(score_id: str, current_user=Depends(get_current_onboarded_student)):
    try:
        doc = await get_ats_score(score_id)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not doc:
        raise HTTPException(status_code=404, detail="Score not found")

    return ATSScorePublic(
        id=doc["id"],
        resume_id=doc["resume_id"],
        job_id=doc["job_id"],
        overall_score=doc["overall_score"],
        breakdown=doc["breakdown"],
        feedback=doc.get("feedback", {}),
        suggestions=doc.get("suggestions", []),
        matched_skills=doc.get("matched_skills", []),
        missing_skills=doc.get("missing_skills", []),
        created_at=doc["created_at"],
    )


@router.get("/history")
async def score_history(current_user=Depends(get_current_onboarded_student)):
    """Get all ATS scores for resumes owned by the current user."""
    try:
        rows = await list_ats_scores_for_user(current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return [
        {
            "id": doc["id"],
            "resume_id": doc["resume_id"],
            "job_id": doc["job_id"],
            "overall_score": doc["overall_score"],
            "created_at": _parse_dt(doc["created_at"]).isoformat(),
        }
        for doc in rows
    ]
