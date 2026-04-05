from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel

from app.models.resume import ResumePublic
from app.services.auth import get_current_onboarded_student
from app.services.resume_latex_service import generate_resume_latex_with_llm
from app.services.resume_parser import parse_resume
from app.services.supabase_db import (
    SupabaseDBError,
    delete_resume_for_user,
    get_resume_for_user,
    insert_resume,
    list_resumes_for_user,
    update_resume_for_user,
)

router = APIRouter()


class ResumeLatexResponse(BaseModel):
    resume_id: str
    latex_source: Optional[str] = None
    latex_updated_at: Optional[datetime] = None
    generated_with: str = "stored"


class ResumeLatexSaveRequest(BaseModel):
    latex_source: str

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}


def serialize_resume(r: dict) -> dict:
    r["_id"] = str(r["_id"])
    return r


def _looks_like_pdf(file_bytes: bytes) -> bool:
    return file_bytes.startswith(b"%PDF")


def _looks_like_docx(file_bytes: bytes) -> bool:
    # DOCX is a zip container.
    return file_bytes.startswith(b"PK\x03\x04")


@router.post("/upload", response_model=ResumePublic, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    current_user=Depends(get_current_onboarded_student),
):
    # Validate file type
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only PDF and DOCX are allowed.",
        )

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid MIME type for resume upload.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    if ext == ".pdf" and not _looks_like_pdf(file_bytes):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF.")
    if ext in {".docx", ".doc"} and not _looks_like_docx(file_bytes):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid DOCX/DOC file.")

    try:
        parsed = parse_resume(file_bytes, file.filename or "resume")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    doc = {
        "user_id": current_user["_id"],
        "filename": file.filename,
        "file_size": len(file_bytes),
        "uploaded_at": datetime.now(timezone.utc),
        **parsed,
    }
    try:
        created = await insert_resume(doc)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ResumePublic(
        id=created["id"],
        user_id=created["user_id"],
        filename=created["filename"],
        file_size=created.get("file_size"),
        extracted_links=created.get("extracted_links", {}),
        skills=created.get("skills", []),
        status=created.get("status", "parsed"),
        parser_version=created.get("parser_version", "v1"),
        screening_summary=created.get("screening_summary", {}),
        link_analysis=created.get("link_analysis", {}),
        latex_source=created.get("latex_source"),
        latex_updated_at=created.get("latex_updated_at"),
        uploaded_at=created["uploaded_at"],
        parsed_text=created.get("parsed_text"),
    )


@router.get("/list", response_model=list[ResumePublic])
async def list_resumes(current_user=Depends(get_current_onboarded_student)):
    try:
        rows = await list_resumes_for_user(current_user["_id"], include_parsed_text=False)
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    results = []
    for doc in rows:
        results.append(
            ResumePublic(
                id=doc["id"],
                user_id=doc["user_id"],
                filename=doc.get("filename", ""),
                file_size=doc.get("file_size"),
                extracted_links=doc.get("extracted_links", {}),
                skills=doc.get("skills", []),
                status=doc.get("status", "parsed"),
                parser_version=doc.get("parser_version", "v1"),
                screening_summary=doc.get("screening_summary", {}),
                link_analysis=doc.get("link_analysis", {}),
                latex_source=doc.get("latex_source"),
                latex_updated_at=doc.get("latex_updated_at"),
                uploaded_at=doc["uploaded_at"],
            )
        )
    return results


@router.get("/{resume_id}", response_model=ResumePublic)
async def get_resume(resume_id: str, current_user=Depends(get_current_onboarded_student)):
    try:
        doc = await get_resume_for_user(resume_id, current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found")

    return ResumePublic(
        id=doc["id"],
        user_id=doc["user_id"],
        filename=doc.get("filename", ""),
        file_size=doc.get("file_size"),
        extracted_links=doc.get("extracted_links", {}),
        skills=doc.get("skills", []),
        status=doc.get("status", "parsed"),
        parser_version=doc.get("parser_version", "v1"),
        screening_summary=doc.get("screening_summary", {}),
        link_analysis=doc.get("link_analysis", {}),
        latex_source=doc.get("latex_source"),
        latex_updated_at=doc.get("latex_updated_at"),
        uploaded_at=doc["uploaded_at"],
        parsed_text=doc.get("parsed_text"),
    )


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(resume_id: str, current_user=Depends(get_current_onboarded_student)):
    try:
        deleted = await delete_resume_for_user(resume_id, current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not deleted:
        raise HTTPException(status_code=404, detail="Resume not found")


@router.get("/{resume_id}/latex", response_model=ResumeLatexResponse)
async def get_resume_latex(resume_id: str, current_user=Depends(get_current_onboarded_student)):
    try:
        doc = await get_resume_for_user(resume_id, current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found")

    return ResumeLatexResponse(
        resume_id=doc["id"],
        latex_source=doc.get("latex_source"),
        latex_updated_at=doc.get("latex_updated_at"),
        generated_with="stored",
    )


@router.post("/{resume_id}/latex/generate", response_model=ResumeLatexResponse)
async def generate_resume_latex(resume_id: str, current_user=Depends(get_current_onboarded_student)):
    try:
        doc = await get_resume_for_user(resume_id, current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found")

    latex_source, mode = await generate_resume_latex_with_llm(
        resume_text=doc.get("parsed_text", ""),
        skills=doc.get("skills", []),
        full_name=current_user.get("full_name", "Candidate Name"),
        email=current_user.get("email", "candidate@example.com"),
    )

    now = datetime.now(timezone.utc)
    try:
        updated = await update_resume_for_user(
            resume_id,
            current_user["_id"],
            {
                "latex_source": latex_source,
                "latex_updated_at": now,
            },
        )
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to persist generated LaTeX")

    return ResumeLatexResponse(
        resume_id=updated["id"],
        latex_source=updated.get("latex_source"),
        latex_updated_at=updated.get("latex_updated_at"),
        generated_with=mode,
    )


@router.put("/{resume_id}/latex", response_model=ResumeLatexResponse)
async def save_resume_latex(
    resume_id: str,
    payload: ResumeLatexSaveRequest,
    current_user=Depends(get_current_onboarded_student),
):
    try:
        doc = await get_resume_for_user(resume_id, current_user["_id"])
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found")

    if "\\documentclass" not in payload.latex_source:
        raise HTTPException(status_code=400, detail="LaTeX source must include a full document with \\documentclass")

    now = datetime.now(timezone.utc)
    try:
        updated = await update_resume_for_user(
            resume_id,
            current_user["_id"],
            {
                "latex_source": payload.latex_source,
                "latex_updated_at": now,
            },
        )
    except SupabaseDBError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to save LaTeX")

    return ResumeLatexResponse(
        resume_id=updated["id"],
        latex_source=updated.get("latex_source"),
        latex_updated_at=updated.get("latex_updated_at"),
        generated_with="stored",
    )
