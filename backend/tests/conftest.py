"""Shared pytest fixtures. The Gemini provider is always mocked — no real API calls."""

import os

# Dummy key so service-level key checks pass unless a test overrides them.
# Never a real key; real network is never touched because _call_gemini /
# generate_questions_service are patched in every test that needs them.
os.environ.setdefault("GEMINI_API_KEY", "test-key-not-real")

from fastapi.testclient import TestClient

import pytest

from app.main import app
from app.routes.questions import clear_rate_limit_store


def make_question(i: int = 0) -> dict:
    return {
        "question": f"Sample question {i + 1}?",
        "options": [f"Option {i + 1}{chr(65 + j)}" for j in range(4)],
        "correctAnswer": i % 4,
        "explanation": f"Explanation {i + 1}.",
    }


def make_questions(n: int) -> list[dict]:
    return [make_question(i) for i in range(n)]


@pytest.fixture()
def client():
    clear_rate_limit_store()
    with TestClient(app) as test_client:
        yield test_client
    clear_rate_limit_store()


@pytest.fixture()
def valid_payload():
    return {"track": "technical", "topic": "DBMS normalization", "difficulty": "Medium", "count": 2}
