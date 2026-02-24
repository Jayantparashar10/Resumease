from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from bson import ObjectId
from datetime import datetime, timedelta

from app.database import get_db
from app.services.auth import get_current_user
from app.services.github_analyzer import fetch_github_profile
from app.services.link_extractor import extract_github_username

router = APIRouter()


@router.post("/github")
async def analyze_github(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    """Trigger GitHub analysis for a username."""
    username = payload.get("username")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    db = get_db()
    # Check cache (24-hour TTL)
    cached = await db.github_analysis.find_one({"username": username})
    if cached:
        cache_age = datetime.utcnow() - cached.get("analyzed_at", datetime.min)
        if cache_age < timedelta(hours=24):
            cached["_id"] = str(cached["_id"])
            return cached

    # Fetch and cache in background
    result = await fetch_github_profile(username)
    if "error" not in result:
        result["analyzed_at"] = datetime.utcnow()
        await db.github_analysis.update_one(
            {"username": username},
            {"$set": result},
            upsert=True,
        )

    return result


@router.get("/github/{username}")
async def get_github_analysis(username: str, current_user=Depends(get_current_user)):
    """Get cached GitHub analysis."""
    db = get_db()
    cached = await db.github_analysis.find_one({"username": username})
    if not cached:
        # Fetch fresh
        result = await fetch_github_profile(username)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        result["analyzed_at"] = datetime.utcnow()
        await db.github_analysis.update_one(
            {"username": username}, {"$set": result}, upsert=True
        )
        return result

    cached["_id"] = str(cached["_id"])
    return cached


@router.post("/links/{resume_id}")
async def analyze_resume_links(resume_id: str, current_user=Depends(get_current_user)):
    """Analyze all links extracted from a resume."""
    db = get_db()
    try:
        obj_id = ObjectId(resume_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resume ID")

    resume = await db.resumes.find_one(
        {"_id": obj_id, "user_id": current_user["_id"]}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    links = resume.get("extracted_links", {})
    analysis_results = {"links": links, "github": None, "link_score": 0}

    github_url = links.get("github")
    if github_url:
        username = extract_github_username(github_url)
        if username:
            gh_data = await fetch_github_profile(username)
            analysis_results["github"] = gh_data
            analysis_results["link_score"] = gh_data.get("github_score", 0)

    # Store link analysis score in resume doc
    await db.resumes.update_one(
        {"_id": obj_id},
        {"$set": {"link_analysis": analysis_results}},
    )

    return analysis_results
