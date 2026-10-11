import hashlib
import secrets
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

router = APIRouter(tags=["auth"])

USER_STORE: dict[str, dict[str, Any]] = {}
TOKEN_STORE: dict[str, str] = {}


class RegisterRequest(BaseModel):
    name: str = Field(max_length=120)
    email: str = Field(max_length=200)
    password: str = Field(max_length=128)
    college: str | None = None
    degree: str | None = None
    department: str | None = None
    year: str | None = None
    phone: str | None = None

    @field_validator("name", "email", "password", "college", "degree", "department", "year", "phone")
    @classmethod
    def clean_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return str(value).strip().lower()


class LoginRequest(BaseModel):
    email: str
    password: str


def _hash_password(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _sanitize_user(user: dict[str, Any]) -> dict[str, Any]:
    user_copy = dict(user)
    user_copy.pop("passwordHash", None)
    return user_copy


def _create_token(email: str) -> str:
    token = secrets.token_urlsafe(32)
    TOKEN_STORE[token] = email
    return token


@router.post("/auth/register")
async def register_user(payload: RegisterRequest):
    email = payload.email.lower().strip()
    if email in USER_STORE:
        raise HTTPException(status_code=409, detail="User already exists.")

    user = {
        "id": secrets.token_urlsafe(8),
        "name": payload.name.strip(),
        "email": email,
        "passwordHash": _hash_password(payload.password),
        "college": payload.college.strip() if payload.college else None,
        "degree": payload.degree.strip() if payload.degree else None,
        "department": payload.department.strip() if payload.department else None,
        "year": payload.year.strip() if payload.year else None,
        "phone": payload.phone.strip() if payload.phone else None,
        "role": "admin" if email.startswith("admin@") else "student",
    }
    USER_STORE[email] = user
    token = _create_token(email)
    return {"token": token, "user": _sanitize_user(user)}


@router.post("/auth/login")
async def login_user(payload: LoginRequest):
    email = payload.email.strip().lower()
    user = USER_STORE.get(email)
    if not user or user["passwordHash"] != _hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = _create_token(email)
    return {"token": token, "user": _sanitize_user(user)}


@router.get("/auth/me")
async def me(request: Request):
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    token = authorization.split(" ", 1)[1].strip()
    email = TOKEN_STORE.get(token)
    if not email or email not in USER_STORE:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    return {"user": _sanitize_user(USER_STORE[email])}
