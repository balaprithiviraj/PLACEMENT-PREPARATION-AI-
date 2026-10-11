"""POST /api/questions/generate: shape, 422 validation, 429, 502. Provider mocked."""

from unittest.mock import AsyncMock, patch

import pytest

from app.schemas import GeneratedQuestion


def _mock_service(questions):
    models = [GeneratedQuestion.model_validate(q) for q in questions]
    return AsyncMock(return_value=models)


def test_generate_success_exact_count_and_shape(client, valid_payload):
    from tests.conftest import make_questions

    expected = make_questions(2)
    with patch(
        "app.routes.questions.generate_questions_service",
        new=_mock_service(expected),
    ):
        response = client.post("/api/questions/generate", json=valid_payload)

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"data"}
    questions = body["data"]["questions"]
    assert len(questions) == valid_payload["count"] == 2
    for i, item in enumerate(questions):
        assert isinstance(item["question"], str) and item["question"].strip()
        assert isinstance(item["options"], list) and len(item["options"]) == 4
        assert all(isinstance(o, str) and o.strip() for o in item["options"])
        assert len(set(o.strip() for o in item["options"])) == 4
        assert item["correctAnswer"] in (0, 1, 2, 3)
        assert isinstance(item["explanation"], str) and item["explanation"].strip()
    assert questions[0]["question"] == expected[0]["question"]


@pytest.mark.parametrize(
    "payload",
    [
        {"track": "hr", "topic": "DBMS normalization", "difficulty": "Medium", "count": 2},
        {"track": "technical", "topic": "x", "difficulty": "Medium", "count": 2},
        {"track": "technical", "topic": "   ", "difficulty": "Medium", "count": 2},
        {"track": "technical", "topic": "DBMS normalization", "difficulty": "Extreme", "count": 2},
        {"track": "technical", "topic": "DBMS normalization", "difficulty": "Medium", "count": 0},
        {"track": "technical", "topic": "DBMS normalization", "difficulty": "Medium", "count": 16},
        {"track": "technical", "topic": "a" * 121, "difficulty": "Medium", "count": 2},
        {"track": "aptitude", "topic": "OK topic", "difficulty": "medium", "count": 2},
    ],
)
def test_generate_validation_422(client, payload):
    response = client.post("/api/questions/generate", json=payload)
    assert response.status_code == 422


def test_generate_accepts_all_valid_combinations(client):
    from tests.conftest import make_questions

    for track in ("technical", "aptitude"):
        for difficulty in ("Easy", "Medium", "Hard", "Mixed"):
            payload = {"track": track, "topic": "Permutations", "difficulty": difficulty, "count": 1}
            with patch(
                "app.routes.questions.generate_questions_service",
                new=_mock_service(make_questions(1)),
            ):
                response = client.post("/api/questions/generate", json=payload)
            assert response.status_code == 200
            assert len(response.json()["data"]["questions"]) == 1


def test_generate_rate_limit_429(client, valid_payload):
    from tests.conftest import make_questions

    with patch(
        "app.routes.questions.generate_questions_service",
        new=_mock_service(make_questions(2)),
    ):
        statuses = [
            client.post("/api/questions/generate", json=valid_payload).status_code
            for _ in range(11)
        ]
    assert statuses[:10] == [200] * 10
    assert statuses[10] == 429


def test_generate_provider_failure_502(client, valid_payload):
    from app.services.gemini_service import ProviderError

    with patch(
        "app.routes.questions.generate_questions_service",
        new=AsyncMock(side_effect=ProviderError("down")),
    ):
        response = client.post("/api/questions/generate", json=valid_payload)
    assert response.status_code == 502
    assert response.json()["detail"] == "AI provider failed. Please try again later."
