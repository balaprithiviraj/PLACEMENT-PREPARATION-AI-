"""Tests for AI Orchestrator with Multi-Model Ensemble, Quota Failover, and Auto-Repair."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas import GenerateQuestionsRequest
from app.services.gemini_service import (
    ProviderError,
    RateLimitError,
    _auto_repair_and_validate,
    _classify_sdk_error,
    generate_questions_service,
    repair_question_item,
    validate_questions,
)


def _request(count: int = 2) -> GenerateQuestionsRequest:
    return GenerateQuestionsRequest(
        track="technical", topic="System Design", difficulty="Hard", count=count
    )


def test_repair_question_item_fixes_missing_options():
    imperfect = {
        "question": "What is horizontal scaling?",
        "options": ["Adding more machines", "Adding more RAM"],
        "correctAnswer": 0,
        "explanation": "Scales out by adding nodes.",
    }
    repaired = repair_question_item(imperfect, 0)
    assert repaired is not None
    assert len(repaired["options"]) == 4
    assert len(set(repaired["options"])) == 4
    assert repaired["correctAnswer"] == 0
    assert repaired["question"] == "What is horizontal scaling?"


def test_repair_question_item_normalizes_string_answer():
    imperfect = {
        "question": "What is an index in DB?",
        "options": ["Data structure", "CPU cycle", "Network cable", "RAM stick"],
        "correctAnswer": "A",
        "explanation": "Improves lookup speed.",
    }
    repaired = repair_question_item(imperfect, 0)
    assert repaired is not None
    assert repaired["correctAnswer"] == 0


def test_auto_repair_and_validate_heals_irregular_output():
    raw = {
        "questions": [
            {
                "question": "Q1?",
                "options": ["A", "B"],  # only 2 options
                "correctAnswer": "A",
                "explanation": "",  # missing explanation
            },
            {
                "question": "Q2?",
                "options": ["Opt1", "Opt2", "Opt3", "Opt4", "Extra"],  # 5 options
                "correctAnswer": 1,
                "explanation": "Valid",
            },
        ]
    }
    validated = _auto_repair_and_validate(raw, 2)
    assert len(validated) == 2
    assert len(validated[0].options) == 4
    assert len(validated[1].options) == 4
    assert validated[0].correctAnswer in (0, 1, 2, 3)
    assert validated[0].explanation.strip() != ""


def test_classify_sdk_error_handles_410_gone_as_provider_error():
    class DummyHttpError(Exception):
        status_code = 410

    classified = _classify_sdk_error(DummyHttpError(), "fallback provider")
    assert isinstance(classified, ProviderError)
    assert "4xx" in str(classified) or "rejected" in str(classified)


def test_classify_sdk_error_handles_resource_exhausted_as_rate_limit():
    class DummyQuotaError(Exception):
        pass

    classified = _classify_sdk_error(
        DummyQuotaError("429 RESOURCE_EXHAUSTED Quota exceeded for metric"), "gemini"
    )
    assert isinstance(classified, RateLimitError)
