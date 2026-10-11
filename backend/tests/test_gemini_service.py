"""Gemini service: structured validation + retry-once. Provider mocked."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas import GenerateQuestionsRequest
from app.services.gemini_service import (
    ProviderError,
    build_prompt,
    generate_questions_service,
    validate_questions,
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


def test_build_prompt_contains_constraints():
    prompt = build_prompt(_request(count=3))
    assert "exactly 3" in prompt
    assert "DBMS normalization" in prompt
    assert "correctAnswer" in prompt


def test_validate_questions_rejects_bad_shapes():
    with pytest.raises(ValueError):
        validate_questions({"questions": []}, 2)
    with pytest.raises(ValueError):
        validate_questions({"nope": []}, 2)
    bad = _raw(2)
    bad["questions"][0]["options"] = ["same", "same", "x", "y"]
    with pytest.raises(ValueError):
        validate_questions(bad, 2)
    bad2 = _raw(2)
    bad2["questions"][1]["correctAnswer"] = 7
    with pytest.raises(ValueError):
        validate_questions(bad2, 2)


def test_service_retries_once_then_succeeds():
    async def _run():
        with patch(
            "app.services.gemini_service._call_gemini",
            new=AsyncMock(side_effect=[{"questions": []}, _raw(2)]),
        ) as mocked:
            questions = await generate_questions_service(_request(count=2))
            return mocked, questions

    mocked, questions = asyncio.run(_run())
    assert mocked.await_count == 2
    assert len(questions) == 2
    assert questions[0].options[questions[0].correctAnswer].strip() != ""


def test_service_raises_provider_error_after_two_failures():
    async def _run():
        with patch(
            "app.services.gemini_service._call_gemini",
            new=AsyncMock(side_effect=[{"questions": []}, {"questions": []}]),
        ) as mocked:
            with pytest.raises(ProviderError):
                await generate_questions_service(_request(count=2))
            return mocked

    mocked = asyncio.run(_run())
    assert mocked.await_count == 2
