from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from datetime import datetime, timedelta, timezone

from app.services.auth import get_current_onboarded_student
from app.services.github_analyzer import fetch_github_profile
from app.services.portfolio_analyzer import get_portfolio_analysis as fetch_portfolio_analysis
from app.services.link_extractor import extract_github_username
from app.services.supabase_db import (
    SupabaseDBError,
    get_github_analysis as get_github_analysis_row,
    get_resume_for_user,
    update_resume,
    upsert_github_analysis,
)

router = APIRouter()


@router.post("/github")
async def analyze_github(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_onboarded_student),
):
    """Trigger GitHub analysis for a username."""
    username = payload.get("username")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    # Check cache (24-hour TTL)
    try:
        cached = await get_github_analysis_row(username)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if cached:
        cached_data = cached.get("data", {})
        analyzed_at = cached.get("analyzed_at")
        if analyzed_at:
            cache_age = datetime.now(timezone.utc) - datetime.fromisoformat(str(analyzed_at).replace("Z", "+00:00"))
        else:
            cache_age = timedelta.max
        if cache_age < timedelta(hours=24):
            return cached_data

    # Fetch and cache in background
    result = await fetch_github_profile(username)
    if "error" not in result:
        try:
            await upsert_github_analysis(
                {
                    "username": username,
                    "data": result,
                    "analyzed_at": datetime.now(timezone.utc),
                }
            )
        except SupabaseDBError:
            pass

    return result


@router.get("/github/{username}")
async def get_github_analysis(username: str, current_user=Depends(get_current_onboarded_student)):
    """Get cached GitHub analysis."""
    try:
        cached = await get_github_analysis_row(username)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not cached:
        # Fetch fresh
        result = await fetch_github_profile(username)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        try:
            await upsert_github_analysis(
                {
                    "username": username,
                    "data": result,
                    "analyzed_at": datetime.now(timezone.utc),
                }
            )
        except SupabaseDBError:
            pass
        return result

    return cached.get("data", {})


@router.post("/links/{resume_id}")
async def analyze_resume_links(resume_id: str, current_user=Depends(get_current_onboarded_student)):
    """Analyze all links extracted from a resume."""
    try:
        resume = await get_resume_for_user(resume_id, current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    links = resume.get("extracted_links", {})
    analysis_results = {
        "links": links,
        "github": None,
        "portfolio": None,
        "link_score": 0,
    }

    github_url = links.get("github")
    if github_url:
        username = extract_github_username(github_url)
        if username:
            gh_data = await fetch_github_profile(username)
            analysis_results["github"] = gh_data
            if gh_data and "github_score" in gh_data:
                analysis_results["link_score"] += gh_data.get("github_score", 0) * 0.6  # Scale based on weights or use as raw metric
                
    portfolio_url = links.get("portfolio")
    if portfolio_url:
        pf_data = await fetch_portfolio_analysis(portfolio_url)
        analysis_results["portfolio"] = pf_data
        if pf_data and "portfolio_score" in pf_data:
            analysis_results["link_score"] += pf_data.get("portfolio_score", 0) * 0.4  # Weight the link_score composite

    # Store link analysis score in resume doc
    try:
        await update_resume(resume_id, {"link_analysis": analysis_results})
    except SupabaseDBError:
        pass

    return analysis_results
