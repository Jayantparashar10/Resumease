from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.models.ats_score import ATSScorePublic, ScoreRequest
from app.services.auth import get_current_user
from app.services.llm_service import score_resume_with_llm

router = APIRouter()


@router.post("/score", response_model=ATSScorePublic, status_code=201)
async def score_resume(
    request: ScoreRequest,
    current_user=Depends(get_current_user),
):
    db = get_db()

    # Validate resume ownership
    try:
        resume_oid = ObjectId(request.resume_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resume ID")

    resume = await db.resumes.find_one(
        {"_id": resume_oid, "user_id": current_user["_id"]}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Validate job exists
    try:
        job_oid = ObjectId(request.job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")

    job = await db.jobs.find_one({"_id": job_oid})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check cache (7-day TTL)
    from datetime import timedelta
    existing = await db.ats_scores.find_one(
        {"resume_id": request.resume_id, "job_id": request.job_id}
    )
    if existing:
        age = datetime.utcnow() - existing.get("created_at", datetime.min)
        if age < timedelta(days=7):
            existing["_id"] = str(existing["_id"])
            return ATSScorePublic(
                id=existing["_id"],
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
            cached_gh = await db.github_analysis.find_one({"username": username})
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
        "created_at": datetime.utcnow(),
    }

    result = await db.ats_scores.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return ATSScorePublic(
        id=doc["_id"],
        resume_id=doc["resume_id"],
        job_id=doc["job_id"],
        overall_score=doc["overall_score"],
        breakdown=doc["breakdown"],
        feedback=doc["feedback"],
        suggestions=doc["suggestions"],
        matched_skills=doc["matched_skills"],
        missing_skills=doc["missing_skills"],
        created_at=doc["created_at"],
    )


@router.get("/score/{score_id}", response_model=ATSScorePublic)
async def get_score(score_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    try:
        obj_id = ObjectId(score_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid score ID")

    doc = await db.ats_scores.find_one({"_id": obj_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Score not found")

    doc["_id"] = str(doc["_id"])
    return ATSScorePublic(
        id=doc["_id"],
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
async def score_history(current_user=Depends(get_current_user)):
    """Get all ATS scores for resumes owned by the current user."""
    db = get_db()
    # Get user's resume IDs
    resume_ids = []
    async for resume in db.resumes.find(
        {"user_id": current_user["_id"]}, {"_id": 1}
    ):
        resume_ids.append(str(resume["_id"]))

    scores = []
    async for doc in db.ats_scores.find(
        {"resume_id": {"$in": resume_ids}}
    ).sort("created_at", -1):
        doc["_id"] = str(doc["_id"])
        scores.append({
            "id": doc["_id"],
            "resume_id": doc["resume_id"],
            "job_id": doc["job_id"],
            "overall_score": doc["overall_score"],
            "created_at": doc["created_at"].isoformat(),
        })

    return scores
