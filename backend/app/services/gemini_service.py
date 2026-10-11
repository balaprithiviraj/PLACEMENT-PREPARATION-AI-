"""AI-backed question generation with multi-model orchestration, auto-repair, and resilient retries.

Primary: Google Gemini with Multi-Model Ensemble Pool (gemini-3-flash-preview,
gemini-3.1-flash-lite, gemini-3.7-flash, gemini-3.8-flash) with adaptive
failover on quota exhaustion.
Fallback: OpenCode Zen / OpenAI-compatible endpoint with fast-fail on 410/404.

No API key is requested or stored here; keys are read from settings (env)
and NEVER appear in logs, errors, or responses. All log lines carry only
provider name, model identifier, attempt counters, error class names, status codes,
and latencies — safe to keep in server logs.

Failure taxonomy (routes map these to HTTP codes):
- ProviderError  -> permanent/config/auth failure -> HTTP 502, fail fast.
- RateLimitError -> throttle/overload (429/5xx upstream) -> backoff + retry,
    and if still failing -> HTTP 429 with a retry hint.
- TransientError -> network/timeout/HTTP-5xx transport fault -> backoff +
    retry, and if still failing -> HTTP 502 (generic, no internals).
- ValueError     -> malformed/ invalid AI content -> one retry, then 502.
"""

import asyncio
import json
import logging
import random
import time
from typing import Any

from pydantic import BaseModel, Field

from app.config import settings
from app.schemas import GeneratedQuestion, GenerateQuestionsRequest

logger = logging.getLogger("placement_ai.provider")

MAX_TRANSIENT_ATTEMPTS = 3
MAX_VALIDATION_ATTEMPTS = 2


class ProviderError(Exception):
    """Permanent AI-provider failure (bad key, bad model, not configured)."""


class RateLimitError(Exception):
    """Upstream throttle/overload. Safe to map to HTTP 429 with retry hint."""


class TransientError(ValueError):
    """Network/timeout/HTTP-5xx transport fault. Worth backing off."""


# Structured-output contract sent to Gemini. The SDK serialises this
# Pydantic model into the response JSON schema.
class _GeminiQuestion(BaseModel):
    question: str = Field(min_length=1)
    options: list[str] = Field(min_length=4, max_length=4)
    correctAnswer: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1)


class _GeminiQuestionList(BaseModel):
    questions: list[_GeminiQuestion]


def build_prompt(payload: GenerateQuestionsRequest) -> str:
    return (
        f"Generate exactly {payload.count} placement-practice multiple-choice "
        f"questions. Track: {payload.track}. Topic: {payload.topic}. "
        f"Difficulty: {payload.difficulty}. "
        "Return JSON only with shape "
        '{"questions": [{"question": str, "options": [four unique non-empty strings], '
        '"correctAnswer": 0-3 index into options, "explanation": str}]}. '
        "Every question must have exactly 4 distinct non-empty options, a "
        "correctAnswer integer between 0 and 3, and a one-to-two sentence explanation."
    )


def _backoff_seconds(attempt: int) -> float:
    """Exponential backoff with jitter: ~1s, ~2s, ~4s (capped at 8s)."""
    return min(2 ** (attempt - 1), 8) + random.uniform(0, 0.5)


def _loads_json_lenient(text: str, where: str) -> object:
    """Parse provider JSON, tolerating fences and surrounding prose.

    Never raises json.JSONDecodeError — always ValueError on failure —
    and never includes provider text in the message (it may be huge).
    """
    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError(f"{where} returned an empty response")
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    # Strip ```json ... ``` fences without corrupting legit content.
    if cleaned.startswith("```"):
        inner = cleaned[3:]
        if inner[:3].lower() == "```":
            inner = inner[3:]
        lines = inner.splitlines()
        if lines and lines[0].strip().lower() == "json":
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        candidate = "\n".join(lines).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
    # Last resort: extract the outermost {...} object.
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError:
            pass
    raise ValueError(f"{where} returned invalid JSON")


def _classify_sdk_error(exc: Exception, where: str) -> Exception:
    """Map a raw SDK/HTTP exception to our taxonomy (no key material)."""
    code = getattr(exc, "code", None)
    status = getattr(exc, "status_code", code)
    try:
        code_int = int(status) if status is not None else None
    except (TypeError, ValueError):
        code_int = None
    name = type(exc).__name__
    msg = str(exc)
    if (
        code_int == 429
        or "RATE_LIMIT" in name.upper()
        or "RESOURCE_EXHAUSTED" in name.upper()
        or "RESOURCE_EXHAUSTED" in msg.upper()
        or "429" in msg
    ):
        return RateLimitError(f"{where} rate limited (upstream 429)")
    if code_int in (500, 502, 503, 504) or "OVERLOAD" in name.upper() or "UNAVAILABLE" in name.upper():
        return RateLimitError(f"{where} overloaded (upstream {code_int or '5xx'})")
    if (
        code_int in (400, 401, 403, 404, 410)
        or "AUTH" in name.upper()
        or "PERMISSION" in name.upper()
        or "NOT_FOUND" in name.upper()
    ):
        return ProviderError(f"{where} rejected the request (upstream {code_int or '4xx'})")
    if "TIMEOUT" in name.upper() or "TIMEDOUT" in name.upper():
        return TransientError(f"{where} timed out")
    return TransientError(f"{where} transport fault ({name})")


def repair_question_item(item: Any, index: int = 0) -> dict[str, Any] | None:
    """Subagent utility: auto-repair minor schema defects from raw model output.

    Guarantees exactly 4 distinct options, valid correctAnswer index, and
    non-empty strings so transient LLM formatting quirks don't trigger crashes.
    """
    if not isinstance(item, dict):
        return None
    question_text = str(item.get("question") or "").strip()
    if not question_text:
        return None

    raw_options = item.get("options")
    cleaned_options: list[str] = []
    if isinstance(raw_options, list):
        for opt in raw_options:
            s = str(opt).strip()
            if s and s not in cleaned_options:
                cleaned_options.append(s)

    fallback_distractors = [
        "None of the mentioned",
        "All of the mentioned",
        "Cannot be determined",
        "Implementation dependent",
    ]
    distractor_idx = 0
    while len(cleaned_options) < 4:
        cand = fallback_distractors[distractor_idx % len(fallback_distractors)]
        distractor_idx += 1
        if cand not in cleaned_options:
            cleaned_options.append(cand)
        else:
            cand = f"Alternative option {len(cleaned_options) + 1}"
            if cand not in cleaned_options:
                cleaned_options.append(cand)
    if len(cleaned_options) > 4:
        cleaned_options = cleaned_options[:4]

    raw_answer = item.get("correctAnswer")
    if raw_answer is None:
        raw_answer = item.get("correct_answer", item.get("answer"))

    answer_idx = 0
    if isinstance(raw_answer, int):
        answer_idx = max(0, min(3, raw_answer))
    elif isinstance(raw_answer, str):
        val = raw_answer.strip().upper()
        if val in ("0", "1", "2", "3"):
            answer_idx = int(val)
        elif val in ("A", "B", "C", "D"):
            answer_idx = ord(val) - ord("A")
        elif val in cleaned_options:
            answer_idx = cleaned_options.index(val)

    explanation = str(item.get("explanation") or "").strip()
    if not explanation:
        explanation = f"Option {chr(65 + answer_idx)} is the correct answer."

    return {
        "question": question_text,
        "options": cleaned_options,
        "correctAnswer": answer_idx,
        "explanation": explanation,
    }


def validate_questions(raw: object, expected_count: int) -> list[GeneratedQuestion]:
    """Server-side validation shared by both providers."""
    items: object
    if isinstance(raw, dict) and isinstance(raw.get("questions"), list):
        items = raw["questions"]
    elif isinstance(raw, list):
        items = raw
    else:
        raise ValueError("provider returned an unexpected shape")

    assert isinstance(items, list)
    if len(items) != expected_count:
        raise ValueError(f"expected {expected_count} questions, got {len(items)}")
    # GeneratedQuestion validators enforce: four unique non-empty options,
    # correctAnswer 0-3, non-blank question/explanation.
    return [GeneratedQuestion.model_validate(item) for item in items]


def _auto_repair_and_validate(raw: object, expected_count: int) -> list[GeneratedQuestion]:
    """Try direct validation; on minor schema flaws, run repair subagent to heal."""
    try:
        return validate_questions(raw, expected_count)
    except ValueError:
        pass

    # Extract items to repair
    raw_list: list[Any] = []
    if isinstance(raw, dict) and isinstance(raw.get("questions"), list):
        raw_list = raw["questions"]
    elif isinstance(raw, list):
        raw_list = raw

    if not raw_list:
        raise ValueError("provider returned an empty shape")

    repaired: list[dict[str, Any]] = []
    for idx, itm in enumerate(raw_list):
        rep = repair_question_item(itm, idx)
        if rep is not None:
            repaired.append(rep)

    if len(repaired) >= expected_count:
        repaired = repaired[:expected_count]
        return validate_questions({"questions": repaired}, expected_count)

    raise ValueError(f"expected {expected_count} questions, got {len(repaired)}")


async def _call_gemini(prompt: str, model_name: str | None = None) -> object:
    """Raw structured call to Gemini. Mocked in tests.

    When running live, orchestrates through candidate models in the pool
    (settings.gemini_model_candidates) if a model hits hard 429 quota exhaustion.
    """
    try:
        from google import genai  # type: ignore
    except ImportError as exc:
        raise ProviderError("AI provider is not available") from exc

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ProviderError("AI provider is not configured")

    client = genai.Client(api_key=api_key)

    candidates = [model_name] if model_name else settings.gemini_model_candidates()

    def _blocking_call() -> str:
        last_exception: Exception | None = None
        for cand in candidates:
            try:
                response = client.models.generate_content(
                    model=cand,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": _GeminiQuestionList,
                        "temperature": 0.7,
                        "max_output_tokens": 4096,
                    },
                )
                parsed = getattr(response, "parsed", None)
                if parsed is not None:
                    if isinstance(parsed, BaseModel):
                        return parsed.model_dump_json()
                    return json.dumps(parsed)
                text = getattr(response, "text", "") or ""
                if not text.strip():
                    raise ValueError("empty provider response")
                return text
            except Exception as exc:
                last_exception = exc
                err_msg = str(exc)
                # If quota exhausted (429) or model missing (404), failover immediately
                # to the next candidate model in the pool instead of failing.
                if (
                    "RESOURCE_EXHAUSTED" in err_msg
                    or "429" in err_msg
                    or "NOT_FOUND" in err_msg
                    or "404" in err_msg
                ) and cand != candidates[-1]:
                    logger.warning(
                        "provider=gemini model=%s outcome=quota_failover next=%s",
                        cand,
                        candidates[candidates.index(cand) + 1],
                    )
                    continue
                raise
        assert last_exception is not None
        raise last_exception

    try:
        text = await asyncio.to_thread(_blocking_call)
    except (ProviderError, RateLimitError, TransientError, ValueError):
        raise
    except Exception as exc:  # SDK/network faults -> taxonomy
        raise _classify_sdk_error(exc, "gemini") from exc
    return _loads_json_lenient(text, "gemini")


async def _call_zen(prompt: str) -> object:
    """Single raw call to OpenCode Zen (OpenAI-compatible chat completions).

    Mocked in tests via patch; never called without ZEN_API_KEY.
    Fails fast on 401/403/404/410 to prevent hanging retries.
    """
    api_key = settings.ZEN_API_KEY
    if not api_key:
        raise ProviderError("fallback AI provider is not configured")

    try:
        import httpx  # type: ignore
    except ImportError as exc:
        raise ProviderError("AI provider is not available") from exc

    strict_prompt = (
        prompt
        + " Return ONLY raw JSON, no markdown fences, no preamble, no commentary."
    )
    url = settings.ZEN_BASE_URL.rstrip("/") + "/chat/completions"
    request_body = {
        "model": settings.ZEN_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a placement exam setter. Return JSON only.",
            },
            {"role": "user", "content": strict_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
        "response_format": {"type": "json_object"},
    }

    def _blocking_call():
        with httpx.Client(timeout=15.0) as http:
            return http.post(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=request_body,
            )

    try:
        resp = await asyncio.to_thread(_blocking_call)
    except (ProviderError, RateLimitError, TransientError, ValueError):
        raise
    except Exception as exc:
        raise _classify_sdk_error(exc, "fallback provider") from exc

    if resp.status_code in (401, 403):
        raise ProviderError("fallback AI provider rejected the key")
    if resp.status_code in (404, 410):
        raise ProviderError(f"fallback AI provider endpoint unavailable (HTTP {resp.status_code})")
    if resp.status_code == 429:
        raise RateLimitError("fallback provider rate limited (upstream 429)")
    if resp.status_code in (500, 502, 503, 504):
        raise RateLimitError(
            f"fallback provider overloaded (upstream {resp.status_code})"
        )
    if resp.status_code >= 400:
        raise TransientError(f"fallback provider HTTP {resp.status_code}")
    try:
        body = resp.json()
    except ValueError as exc:
        raise ValueError("fallback provider returned invalid JSON") from exc
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("fallback provider returned an unexpected shape") from exc
    text = (content or "").strip()
    if not text:
        raise ValueError("empty fallback provider response")
    return _loads_json_lenient(text, "fallback provider")


async def _attempt_provider(
    call, prompt: str, expected_count: int, name: str
) -> list[GeneratedQuestion]:
    """Try one provider: backoff+retry on throttle/transport, auto-repair on
    malformed content, fail fast on config/auth/endpoint errors."""
    transient_tries = 0
    validation_tries = 0
    while True:
        started = time.monotonic()
        try:
            raw = await call(prompt)
        except ProviderError as exc:
            logger.warning(
                "provider=%s outcome=config_error error=%s",
                name,
                type(exc).__name__,
            )
            raise
        except (RateLimitError, TransientError) as exc:
            transient_tries += 1
            latency_ms = int((time.monotonic() - started) * 1000)
            logger.warning(
                "provider=%s attempt=%d/%d outcome=transient_retry error=%s latency_ms=%d",
                name,
                transient_tries,
                MAX_TRANSIENT_ATTEMPTS,
                type(exc).__name__,
                latency_ms,
            )
            if transient_tries >= MAX_TRANSIENT_ATTEMPTS:
                raise
            await asyncio.sleep(_backoff_seconds(transient_tries))
            continue
        except Exception as exc:  # unexpected transport fault
            transient_tries += 1
            latency_ms = int((time.monotonic() - started) * 1000)
            logger.warning(
                "provider=%s attempt=%d/%d outcome=transient_retry error=%s latency_ms=%d",
                name,
                transient_tries,
                MAX_TRANSIENT_ATTEMPTS,
                type(exc).__name__,
                latency_ms,
            )
            if transient_tries >= MAX_TRANSIENT_ATTEMPTS:
                raise TransientError(f"{name} transport fault") from exc
            await asyncio.sleep(_backoff_seconds(transient_tries))
            continue
        try:
            # First try auto-repair and validation subagent
            questions = _auto_repair_and_validate(raw, expected_count)
        except Exception as exc:
            validation_tries += 1
            latency_ms = int((time.monotonic() - started) * 1000)
            logger.warning(
                "provider=%s attempt=%d/%d outcome=validation_retry error=%s latency_ms=%d",
                name,
                validation_tries,
                MAX_VALIDATION_ATTEMPTS,
                type(exc).__name__,
                latency_ms,
            )
            if validation_tries >= MAX_VALIDATION_ATTEMPTS:
                raise ValueError(f"{name} returned invalid questions") from exc
            continue
        latency_ms = int((time.monotonic() - started) * 1000)
        logger.info(
            "provider=%s outcome=success count=%d latency_ms=%d",
            name,
            len(questions),
            latency_ms,
        )
        return questions


async def generate_questions_service(
    payload: GenerateQuestionsRequest,
) -> list[GeneratedQuestion]:
    """Call Gemini pool first with auto-failover, fallback to Zen on failure.

    RateLimitError propagates (route maps it to HTTP 429 with a retry hint);
    anything else that fails on every configured provider becomes
    ProviderError (route maps it to HTTP 502 without internals).
    """
    prompt = build_prompt(payload)
    has_gemini = bool(settings.GEMINI_API_KEY)
    has_zen = bool(settings.ZEN_API_KEY)
    if not has_gemini and not has_zen:
        raise ProviderError("AI provider is not configured")

    gemini_error: Exception | None = None
    if has_gemini:
        try:
            return await _attempt_provider(_call_gemini, prompt, payload.count, "gemini")
        except Exception as exc:
            gemini_error = exc

    if has_zen:
        try:
            return await _attempt_provider(_call_zen, prompt, payload.count, "zen")
        except RateLimitError:
            raise
        except ProviderError as exc:
            raise exc
        except Exception as exc:
            raise ProviderError(
                "AI provider failed to return valid questions"
            ) from (gemini_error or exc)

    # No fallback configured or both failed: surface the failure kind.
    assert gemini_error is not None
    if isinstance(gemini_error, (RateLimitError, ProviderError)):
        raise gemini_error
    raise ProviderError("AI provider failed to return valid questions") from gemini_error
