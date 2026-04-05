from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone
import re

from app.models.ats_score import ATSScorePublic, ScoreRequest
from app.services.auth import get_current_onboarded_student
from app.services.github_analyzer import fetch_github_profile
from app.services.llm_service import score_resume_with_llm
from app.services.link_extractor import extract_github_username
from app.services.portfolio_analyzer import get_portfolio_analysis as analyze_portfolio
from app.services.supabase_db import (
    SupabaseDBError,
    get_ats_score,
    get_cached_ats_score,
    get_job,
    get_resume_for_user,
    get_github_analysis,
    insert_ats_score,
    list_ats_scores_for_user,
    update_resume,
    upsert_github_analysis,
)

router = APIRouter()


def _parse_dt(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return datetime.now(timezone.utc)


def _normalize_skill(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _github_skill_tokens(github_data: dict) -> set[str]:
    tokens: set[str] = set()

    for language in (github_data.get("languages") or {}).keys():
        normalized = _normalize_skill(str(language))
        if normalized:
            tokens.add(normalized)

    for repo in github_data.get("top_repos") or []:
        for field in ("language", "name", "description"):
            value = repo.get(field)
            if not value:
                continue
            raw = _normalize_skill(str(value))
            if raw:
                tokens.add(raw)
            for part in re.split(r"[^a-z0-9+#.]+", raw):
                if part:
                    tokens.add(part)

    return tokens


def _skill_present_in_github(skill: str, github_tokens: set[str]) -> bool:
    normalized = _normalize_skill(skill)
    if not normalized:
        return False
    if normalized in github_tokens:
        return True
    for token in github_tokens:
        if normalized in token or token in normalized:
            return True
    return False


def _build_github_skill_verification(
    resume_skills: list[str],
    required_skills: list[str],
    github_data: dict,
) -> dict:
    github_tokens = _github_skill_tokens(github_data)
    unique_resume_skills = sorted({_normalize_skill(s) for s in resume_skills if s and _normalize_skill(s)})
    unique_required_skills = sorted({_normalize_skill(s) for s in required_skills if s and _normalize_skill(s)})

    matched_resume_skills = [s for s in unique_resume_skills if _skill_present_in_github(s, github_tokens)]
    missing_resume_skills = [s for s in unique_resume_skills if s not in matched_resume_skills]

    matched_required_skills = [s for s in unique_required_skills if _skill_present_in_github(s, github_tokens)]
    missing_required_skills = [s for s in unique_required_skills if s not in matched_required_skills]

    resume_match_percent = round((len(matched_resume_skills) / max(len(unique_resume_skills), 1)) * 100, 2)
    required_match_percent = round((len(matched_required_skills) / max(len(unique_required_skills), 1)) * 100, 2)

    return {
        "matched_resume_skills": matched_resume_skills,
        "missing_resume_skills": missing_resume_skills,
        "matched_required_skills": matched_required_skills,
        "missing_required_skills": missing_required_skills,
        "resume_skill_match_percent": resume_match_percent,
        "required_skill_match_percent": required_match_percent,
    }


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
    github_data = None
    github_skill_verification = None
    links = resume.get("extracted_links", {})
    gh_url = links.get("github")
    if gh_url:
        username = extract_github_username(gh_url)
        if username:
            try:
                cached_gh = await get_github_analysis(username)
            except SupabaseDBError:
                cached_gh = None

            if cached_gh and cached_gh.get("data"):
                github_data = cached_gh.get("data", {})
                github_score = github_data.get("github_score")
            else:
                github_data = await fetch_github_profile(username)
                if "error" not in github_data:
                    github_score = github_data.get("github_score")
                    try:
                        await upsert_github_analysis(
                            {
                                "username": username,
                                "data": github_data,
                                "analyzed_at": datetime.now(timezone.utc),
                            }
                        )
                    except SupabaseDBError:
                        pass

    if github_data:
        github_skill_verification = _build_github_skill_verification(
            resume_skills=resume.get("skills", []),
            required_skills=job.get("required_skills", []),
            github_data=github_data,
        )

        # Make GitHub scoring job-aware by blending profile quality with required-skill relevance.
        if github_score is not None:
            required_skill_match = github_skill_verification.get("required_skill_match_percent", 0)
            github_score = round(float(github_score) * 0.7 + float(required_skill_match) * 0.3, 2)

    # Get Portfolio score for blended scoring
    portfolio_score = None
    portfolio_data = None
    portfolio_url = links.get("portfolio")
    if portfolio_url:
        try:
            from app.services.supabase_db import get_portfolio_analysis as db_get_portfolio
            cached_port = await db_get_portfolio(portfolio_url)
            if cached_port and cached_port.get("data"):
                portfolio_data = cached_port.get("data", {})
                portfolio_score = portfolio_data.get("portfolio_score")
        except SupabaseDBError:
            cached_port = None

        if portfolio_score is None:
            portfolio_data = await analyze_portfolio(portfolio_url)
            portfolio_score = portfolio_data.get("portfolio_score")

    if github_data or portfolio_data:
        existing_link_analysis = resume.get("link_analysis", {})
        merged_link_analysis = {
            "links": links,
            "github": github_data or existing_link_analysis.get("github"),
            "portfolio": portfolio_data or existing_link_analysis.get("portfolio"),
            "github_skill_verification": github_skill_verification or existing_link_analysis.get("github_skill_verification"),
            "link_score": (
                (github_score or 0) * 0.6 + (portfolio_score or 0) * 0.4
                if (github_score is not None or portfolio_score is not None)
                else existing_link_analysis.get("link_score", 0)
            ),
            "link_verified": 1 if github_data else existing_link_analysis.get("link_verified", 0),
        }
        try:
            await update_resume(request.resume_id, {"link_analysis": merged_link_analysis})
        except SupabaseDBError:
            pass

    # Score with LLM (pass job title for job-specific analysis)
    llm_result = await score_resume_with_llm(
        resume_text=resume.get("parsed_text", ""),
        job_description=job.get("description", ""),
        required_skills=job.get("required_skills", []),
        job_title=job.get("title", "Software Position"),
        github_score=github_score,
        portfolio_score=portfolio_score,
    )

    breakdown = llm_result.get("breakdown", {}) or {}
    breakdown["link_verification"] = 1 if github_data else 0

    # Persist
    doc = {
        "resume_id": request.resume_id,
        "job_id": request.job_id,
        "overall_score": llm_result.get("overall_score", 0),
        "breakdown": breakdown,
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
        error_msg = str(exc)
        if "connection failed" in error_msg.lower() or "ssl" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Database service temporarily unavailable. Please try again in a few moments."
            )
        raise HTTPException(status_code=500, detail=error_msg)

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
