"""FastAPI entrypoint for the AI question generator."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes.auth import router as auth_router
from app.routes.questions import router as questions_router
from app.routes.resumes import router as resumes_router

app = FastAPI(title="Placement Prep AI Question Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(resumes_router, prefix="/api")


@app.exception_handler(HTTPException)
async def http_exception_with_message(request: Request, exc: HTTPException):
    """Return both {message, detail} so the React UI (reads .message) works."""
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"message": detail, "detail": detail})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
