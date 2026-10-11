"""Resume upload + analysis endpoints.

Matches the frontend contract in src/services/api.js:
  POST /api/resumes/upload  (multipart field "resume")
  GET  /api/resumes
  GET  /api/resumes/{id}
  POST /api/resumes/{id}/analyze

Auth reuses the in-memory TOKEN_STORE from auth.py (same process).
Storage is in-memory (same approach as USER_STORE) — fine for local dev.
"""

from __future__ import annotations

import secrets
from typing import Any

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.routes.auth import TOKEN_STORE, USER_STORE
from app.services.resume_service import analyze_resume_text, extract_text, utcnow_iso

router = APIRouter(prefix="/resumes", tags=["resumes"])

MAX_BYTES = 5 * 1024 * 1024
ALLOWED_EXTS = {".pdf", ".docx", ".txt"}

# id -> full record (includes private _text and _owner for re-analysis + scoping)
RESUME_STORE: dict[str, dict[str, Any]] = {}


def _current_user(request: Request) -> dict[str, Any]:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()
    email = TOKEN_STORE.get(token)
    if not email or email not in USER_STORE:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return USER_STORE[email]


def _public(record: dict[str, Any]) -> dict[str, Any]:
    pub = {k: v for k, v in record.items() if not k.startswith("_") and k != "owner"}
    # Frontend navigates with saved?._id — always provide both _id and id.
    if "_id" in record:
        pub["_id"] = record["_id"]
        pub.setdefault("id", record["_id"])
    return pub


def _validate_file(upload: UploadFile, data: bytes) -> str:
    name = (upload.filename or "").strip() or "resume"
    lower = name.lower()
    ext = "." + lower.rsplit(".", 1)[-1] if "." in lower else ""
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail="Only .pdf, .docx or .txt files are accepted.",
        )
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File must be under 5MB.")
    if not data.strip():
        raise HTTPException(status_code=400, detail="File is empty.")
    return name


@router.post("/upload")
async def upload_resume(request: Request, resume: UploadFile = File(...)):
    user = _current_user(request)
    data = await resume.read()
    file_name = _validate_file(resume, data)

    text = extract_text(file_name, data)
    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not read any text from this file. Export as text-based PDF/DOCX/TXT (not a photo scan).",
        )

    analysis = analyze_resume_text(text, file_name)
    rid = secrets.token_urlsafe(8)
    record: dict[str, Any] = {
        "_id": rid,
        "id": rid,
        "fileName": file_name,
        "createdAt": utcnow_iso(),
        "owner": user["email"],
        "_text": text,
        "_owner": user["email"],
        **analysis,
    }
    RESUME_STORE[rid] = record
    return {"data": _public(record)}


@router.get("")
@router.get("/")
async def list_resumes(request: Request):
    user = _current_user(request)
    mine = [r for r in RESUME_STORE.values() if r.get("_owner") == user["email"]]
    mine.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    return {"data": [_public(r) for r in mine]}


@router.get("/{resume_id}")
async def get_resume(resume_id: str, request: Request):
    user = _current_user(request)
    record = RESUME_STORE.get(resume_id)
    if not record or record.get("_owner") != user["email"]:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return {"data": _public(record)}


@router.post("/{resume_id}/analyze")
async def reanalyze_resume(resume_id: str, request: Request):
    user = _current_user(request)
    record = RESUME_STORE.get(resume_id)
    if not record or record.get("_owner") != user["email"]:
        raise HTTPException(status_code=404, detail="Resume not found.")
    analysis = analyze_resume_text(record.get("_text", ""), record.get("fileName", "Resume"))
    record.update(analysis)
    return {"data": _public(record)}


def clear_resume_store() -> None:
    RESUME_STORE.clear()
