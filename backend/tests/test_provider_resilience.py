"""Provider resilience: backoff on throttle, 429 mapping, JSON salvage, no key leaks.

All provider calls mocked — no network, no real keys.
"""

import asyncio
import logging
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas import GenerateQuestionsRequest
from app.services.gemini_service import (
    ProviderError,
    RateLimitError,
    _loads_json_lenient,
    generate_questions_service,
)


def _request(count: int = 2) -> GenerateQuestionsRequest:
    return GenerateQuestionsRequest(
        track="technical", topic="DBMS normalization", difficulty="Medium", count=count
    )


def _raw(n: int) -> dict:
    return {
        "questions": [
            {
                "question": f"Q{i + 1}?",
                "options": [f"Q{i + 1} opt {chr(65 + j)}" for j in range(4)],
                "correctAnswer": i % 4,
                "explanation": f"Why {i + 1}.",
            }
            for i in range(n)
        ]
    }


def _cfg(gemini="gemini-test", zen=""):
    patched = patch("app.services.gemini_service.settings")
    cfg = patched.start()
    cfg.GEMINI_API_KEY = gemini
    cfg.ZEN_API_KEY = zen
    return patched


def test_throttle_retried_with_backoff_then_succeeds():
    async def _run():
        cfg_patch = _cfg()
        try:
            with (
                patch(
                    "app.services.gemini_service._call_gemini",
                    new=AsyncMock(
                        side_effect=[
                            RateLimitError("up 429"),
                            RateLimitError("up 429"),
                            _raw(2),
                        ]
                    ),
                ) as mocked,
                patch("asyncio.sleep", new=AsyncMock()) as slept,
            ):
                questions = await generate_questions_service(_request(count=2))
                return mocked, slept, questions
        finally:
            cfg_patch.stop()

    mocked, slept, questions = asyncio.run(_run())
    assert mocked.await_count == 3
    assert slept.await_count == 2  # backoff between attempts 1-2 and 2-3
    assert len(questions) == 2


def test_persistent_throttle_surfaces_rate_limit_error():
    async def _run():
        cfg_patch = _cfg(gemini="gemini-test", zen="")
        try:
            with patch(
                "app.services.gemini_service._call_gemini",
                new=AsyncMock(side_effect=RateLimitError("up 429")),
            ):
                with pytest.raises(RateLimitError):
                    await generate_questions_service(_request(count=2))
        finally:
            cfg_patch.stop()

    asyncio.run(_run())


def test_route_maps_throttle_to_429_with_retry_hint(client, valid_payload):
    with patch(
        "app.routes.questions.generate_questions_service",
        new=AsyncMock(side_effect=RateLimitError("up 429")),
    ):
        response = client.post("/api/questions/generate", json=valid_payload)
    assert response.status_code == 429
    assert "busy" in response.json()["detail"].lower()


def test_auth_failure_fails_fast_then_zen_succeeds():
    async def _run():
        cfg_patch = _cfg(gemini="gemini-test", zen="zen-test")
        try:
            with (
                patch(
                    "app.services.gemini_service._call_gemini",
                    new=AsyncMock(side_effect=ProviderError("bad key")),
                ) as gemini_mock,
                patch(
                    "app.services.gemini_service._call_zen",
                    new=AsyncMock(return_value=_raw(2)),
                ),
            ):
                questions = await generate_questions_service(_request(count=2))
                return gemini_mock, questions
        finally:
            cfg_patch.stop()

    gemini_mock, questions = asyncio.run(_run())
    assert gemini_mock.await_count == 1  # no retry on auth failure
    assert len(questions) == 2


def test_json_salvage_handles_fences_and_prose():
    import json

    payload = json.dumps(_raw(1))
    fenced = "```json\n" + payload + "\n```"
    assert _loads_json_lenient(fenced, "t") == _raw(1)
    wrapped = "Sure! Here you go:\n" + payload + "\nHope this helps."
    assert _loads_json_lenient(wrapped, "t") == _raw(1)
    with pytest.raises(ValueError):
        _loads_json_lenient("not json at all ((((", "t")
    with pytest.raises(ValueError):
        _loads_json_lenient("   ", "t")


def test_logs_never_contain_keys(caplog):
    async def _run():
        cfg_patch = _cfg(gemini="gemini-test", zen="")
        try:
            with patch(
                "app.services.gemini_service._call_gemini",
                new=AsyncMock(side_effect=RateLimitError("up 429")),
            ):
                with pytest.raises(RateLimitError):
                    await generate_questions_service(_request(count=1))
        finally:
            cfg_patch.stop()

    with caplog.at_level(logging.WARNING, logger="placement_ai.provider"):
        asyncio.run(_run())
    blob = "\n".join(r.getMessage() for r in caplog.records)
    assert "gemini-test" not in blob
    assert "AQ." not in blob  # real-key prefix pattern
    assert any("provider=gemini" in r.getMessage() for r in caplog.records)
