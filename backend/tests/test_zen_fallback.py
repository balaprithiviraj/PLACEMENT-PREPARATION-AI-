"""Zen fallback: Gemini-first, Zen-free-model fallback. Provider calls mocked."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas import GenerateQuestionsRequest
from app.services.gemini_service import ProviderError, generate_questions_service


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


def test_fallback_uses_zen_when_gemini_fails():
    async def _run():
        with (
            patch("app.services.gemini_service._call_gemini", new=AsyncMock(side_effect=ValueError("bad"))),
            patch("app.services.gemini_service._call_zen", new=AsyncMock(return_value=_raw(2))) as zen,
            patch("app.services.gemini_service.settings") as cfg,
        ):
            cfg.GEMINI_API_KEY = "gemini-test"
            cfg.ZEN_API_KEY = "zen-test"
            questions = await generate_questions_service(_request(count=2))
            return zen, questions

    zen, questions = asyncio.run(_run())
    assert zen.await_count >= 1
    assert len(questions) == 2


def test_no_keys_configured_raises_provider_error():
    async def _run():
        with patch("app.services.gemini_service.settings") as cfg:
            cfg.GEMINI_API_KEY = ""
            cfg.ZEN_API_KEY = ""
            with pytest.raises(ProviderError):
                await generate_questions_service(_request(count=2))

    asyncio.run(_run())


def test_both_providers_fail_raises_provider_error():
    async def _run():
        with (
            patch("app.services.gemini_service._call_gemini", new=AsyncMock(side_effect=ValueError("bad"))),
            patch("app.services.gemini_service._call_zen", new=AsyncMock(side_effect=ValueError("bad2"))),
            patch("app.services.gemini_service.settings") as cfg,
        ):
            cfg.GEMINI_API_KEY = "gemini-test"
            cfg.ZEN_API_KEY = "zen-test"
            with pytest.raises(ProviderError):
                await generate_questions_service(_request(count=2))

    asyncio.run(_run())
