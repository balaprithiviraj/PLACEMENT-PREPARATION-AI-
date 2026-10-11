"""POST /api/questions/generate with rate limit, timeout, safe errors."""

import asyncio
import time

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.schemas import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    QuestionsData,
)
from app.services.gemini_service import (
    ProviderError,
    RateLimitError,
    generate_questions_service,
)

router = APIRouter(prefix="/questions", tags=["questions"])

# In-memory fixed-window rate limiter: 10 requests per 10 minutes per IP.
_RATE_LIMIT_STORE: dict[str, list[float]] = {}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client is not None:
        return request.client.host
    return "unknown"


def check_rate_limit(ip: str) -> bool:
    now = time.monotonic()
    window = settings.RATE_LIMIT_WINDOW_SECONDS
    max_hits = settings.RATE_LIMIT_MAX
    hits = [t for t in _RATE_LIMIT_STORE.get(ip, []) if now - t < window]
    if len(hits) >= max_hits:
        _RATE_LIMIT_STORE[ip] = hits
        return False
    hits.append(now)
    _RATE_LIMIT_STORE[ip] = hits
    return True


def clear_rate_limit_store() -> None:
    _RATE_LIMIT_STORE.clear()


@router.post("/generate", response_model=GenerateQuestionsResponse)
async def generate_questions_endpoint(
    payload: GenerateQuestionsRequest, request: Request
) -> GenerateQuestionsResponse:
    if not check_rate_limit(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    try:
        questions = await asyncio.wait_for(
            generate_questions_service(payload),
            timeout=settings.REQUEST_TIMEOUT_SECONDS,
        )
    except (asyncio.TimeoutError, TimeoutError):
        raise HTTPException(status_code=504, detail="Request timed out. Please try again.")
    except RateLimitError:
        # Upstream throttle/overload after backoff+retry: tell the client
        # to wait a bit instead of the generic 502. No internals leaked.
        raise HTTPException(
            status_code=429,
            detail="AI is busy right now. Please wait a few seconds and try again.",
        )
    except ProviderError:
        # Never leak provider internals or keys.
        raise HTTPException(
            status_code=502, detail="AI provider failed. Please try again later."
        )

    return GenerateQuestionsResponse(data=QuestionsData(questions=questions))
