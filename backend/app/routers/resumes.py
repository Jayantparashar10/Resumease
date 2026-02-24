from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.models.resume import ResumePublic
from app.services.auth import get_current_user
from app.services.resume_parser import parse_resume

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


def serialize_resume(r: dict) -> dict:
    r["_id"] = str(r["_id"])
    return r


@router.post("/upload", response_model=ResumePublic, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    # Validate file type
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only PDF and DOCX are allowed.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    try:
        parsed = parse_resume(file_bytes, file.filename or "resume")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    db = get_db()
    doc = {
        "user_id": current_user["_id"],
        "filename": file.filename,
        "file_size": len(file_bytes),
        "uploaded_at": datetime.utcnow(),
        **parsed,
    }
    result = await db.resumes.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return ResumePublic(
        id=doc["_id"],
        user_id=doc["user_id"],
        filename=doc["filename"],
        file_size=doc["file_size"],
        extracted_links=doc["extracted_links"],
        skills=doc["skills"],
        status=doc["status"],
        uploaded_at=doc["uploaded_at"],
        parsed_text=doc.get("parsed_text"),
    )


@router.get("/list", response_model=list[ResumePublic])
async def list_resumes(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.resumes.find(
        {"user_id": current_user["_id"]},
        {"parsed_text": 0},  # exclude heavy text from list
    ).sort("uploaded_at", -1)
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(
            ResumePublic(
                id=doc["_id"],
                user_id=doc["user_id"],
                filename=doc.get("filename", ""),
                file_size=doc.get("file_size"),
                extracted_links=doc.get("extracted_links", {}),
                skills=doc.get("skills", []),
                status=doc.get("status", "parsed"),
                uploaded_at=doc["uploaded_at"],
            )
        )
    return results


@router.get("/{resume_id}", response_model=ResumePublic)
async def get_resume(resume_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    try:
        obj_id = ObjectId(resume_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resume ID")

    doc = await db.resumes.find_one(
        {"_id": obj_id, "user_id": current_user["_id"]}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found")

    doc["_id"] = str(doc["_id"])
    return ResumePublic(
        id=doc["_id"],
        user_id=doc["user_id"],
        filename=doc.get("filename", ""),
        file_size=doc.get("file_size"),
        extracted_links=doc.get("extracted_links", {}),
        skills=doc.get("skills", []),
        status=doc.get("status", "parsed"),
        uploaded_at=doc["uploaded_at"],
        parsed_text=doc.get("parsed_text"),
    )


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(resume_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    try:
        obj_id = ObjectId(resume_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resume ID")

    result = await db.resumes.delete_one(
        {"_id": obj_id, "user_id": current_user["_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
