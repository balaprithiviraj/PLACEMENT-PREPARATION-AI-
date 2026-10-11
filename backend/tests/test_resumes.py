"""Resume endpoints: upload validation, list isolation, detail scoping, re-analyze.

Offline only — resume analysis is heuristic (no network calls).
"""

import json

import pytest

from app.routes.auth import TOKEN_STORE, USER_STORE
from app.routes.questions import clear_rate_limit_store
from app.routes.resumes import clear_resume_store


@pytest.fixture(autouse=True)
def _clean_stores():
    clear_resume_store()
    USER_STORE.clear()
    TOKEN_STORE.clear()
    clear_rate_limit_store()
    yield
    clear_resume_store()
    USER_STORE.clear()
    TOKEN_STORE.clear()
    clear_rate_limit_store()


def _register_and_login(client, email: str, name: str = "Test User") -> str:
    reg = client.post(
        "/api/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "secret123",
            "college": "Test College",
        },
    )
    assert reg.status_code == 200, reg.text
    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "secret123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["token"]
    assert token
    return token


def _sample_text() -> str:
    return (
        "John Doe\n"
        "Skills: Python, FastAPI, JavaScript, React, SQL, MongoDB, Docker, Git, REST APIs, Testing\n"
        "Education: B.Tech Computer Science, Example University, 2024, CGPA 8.5\n"
        "Experience: Software Intern at ExampleCorp. Built REST APIs with FastAPI, "
        "developed a React dashboard, deployed services with Docker, improved latency by 30%.\n"
        "Projects:\n"
        "- Built a full-stack placement tracker with React, Node.js and SQL.\n"
        "- Developed an ML dashboard with Python, Pandas and Scikit-learn.\n"
        "- Created automated tests with Pytest and deployed on Linux with Bash.\n"
        "Links: linkedin.com/in/johndoe github.com/johndoe\n"
        "Contact: 9876543210\n"
    )


def _upload(client, token: str, filename: str = "resume.txt", content: bytes | None = None):
    if content is None:
        content = _sample_text().encode("utf-8")
    return client.post(
        "/api/resumes/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"resume": (filename, content, "text/plain")},
    )


def _assert_no_email_leak(body: dict, email: str) -> None:
    raw = json.dumps(body)
    assert email not in raw, f"owner email leaked in response: {raw[:500]}"
    # _public() must strip both private keys and the plain `owner` key.
    data = body.get("data")
    if isinstance(data, dict):
        assert "owner" not in data
        assert "_owner" not in data
        assert "_text" not in data
    elif isinstance(data, list):
        for item in data:
            assert "owner" not in item
            assert "_owner" not in item
            assert "_text" not in item


def test_upload_txt_returns_scores(client):
    email = "owner1@example.com"
    token = _register_and_login(client, email)
    resp = _upload(client, token)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    data = body["data"]
    for key in ("overallScore", "atsScore", "skills", "missingSkills", "recommendedRoles"):
        assert key in data, f"missing {key} in {sorted(data.keys())}"
    assert isinstance(data["skills"], list)
    assert isinstance(data["missingSkills"], list)
    assert isinstance(data["recommendedRoles"], list)
    assert "_id" in data and "id" in data
    _assert_no_email_leak(body, email)


def test_upload_bad_extension_400(client):
    token = _register_and_login(client, "badext@example.com")
    resp = _upload(client, token, filename="resume.exe", content=b"fake binary content")
    assert resp.status_code == 400, resp.text


def test_upload_empty_file_400(client):
    token = _register_and_login(client, "emptyfile@example.com")
    resp = _upload(client, token, filename="resume.txt", content=b"   \n  ")
    assert resp.status_code == 400, resp.text


def test_list_isolation_and_trailing_slash(client):
    token_a = _register_and_login(client, "alice@example.com", name="Alice")
    token_b = _register_and_login(client, "bob@example.com", name="Bob")

    # Alice uploads one resume.
    up_a = _upload(client, token_a, filename="alice.txt")
    assert up_a.status_code == 200, up_a.text

    # Bob sees none of Alice's resumes.
    list_b = client.get("/api/resumes", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200, list_b.text
    assert list_b.json()["data"] == []

    # Alice sees only her own.
    list_a = client.get("/api/resumes", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200, list_a.text
    assert len(list_a.json()["data"]) == 1

    # Bob uploads, still isolated both ways.
    up_b = _upload(client, token_b, filename="bob.txt")
    assert up_b.status_code == 200, up_b.text
    list_a2 = client.get("/api/resumes", headers={"Authorization": f"Bearer {token_a}"})
    list_b2 = client.get("/api/resumes", headers={"Authorization": f"Bearer {token_b}"})
    assert len(list_a2.json()["data"]) == 1
    assert len(list_b2.json()["data"]) == 1
    assert list_a2.json()["data"][0]["_id"] != list_b2.json()["data"][0]["_id"]

    # Trailing-slash alias returns the same list.
    slash_a = client.get("/api/resumes/", headers={"Authorization": f"Bearer {token_a}"})
    assert slash_a.status_code == 200, slash_a.text
    assert slash_a.json() == list_a2.json()

    _assert_no_email_leak(list_a2.json(), "alice@example.com")
    _assert_no_email_leak(list_b2.json(), "bob@example.com")


def test_detail_owner_ok_other_user_404(client):
    token_a = _register_and_login(client, "detail-a@example.com", name="Detail A")
    token_b = _register_and_login(client, "detail-b@example.com", name="Detail B")
    up = _upload(client, token_a)
    assert up.status_code == 200, up.text
    rid = up.json()["data"]["_id"]

    got = client.get(f"/api/resumes/{rid}", headers={"Authorization": f"Bearer {token_a}"})
    assert got.status_code == 200, got.text
    assert got.json()["data"]["_id"] == rid
    _assert_no_email_leak(got.json(), "detail-a@example.com")

    other = client.get(f"/api/resumes/{rid}", headers={"Authorization": f"Bearer {token_b}"})
    assert other.status_code == 404, other.text


def test_reanalyze_deterministic(client):
    email = "reanalyze@example.com"
    token = _register_and_login(client, email)
    up = _upload(client, token)
    assert up.status_code == 200, up.text
    first = up.json()["data"]
    rid = first["_id"]

    again = client.post(
        f"/api/resumes/{rid}/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert again.status_code == 200, again.text
    second = again.json()["data"]
    assert second["overallScore"] == first["overallScore"]
    assert second["atsScore"] == first["atsScore"]
    assert second["skills"] == first["skills"]
    assert second["missingSkills"] == first["missingSkills"]
    assert second["recommendedRoles"] == first["recommendedRoles"]
    _assert_no_email_leak(again.json(), email)


def test_responses_never_contain_owner_email(client):
    email = "noleak@example.com"
    token = _register_and_login(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    up = _upload(client, token)
    assert up.status_code == 200, up.text
    _assert_no_email_leak(up.json(), email)
    rid = up.json()["data"]["_id"]

    for resp in (
        client.get("/api/resumes", headers=headers),
        client.get("/api/resumes/", headers=headers),
        client.get(f"/api/resumes/{rid}", headers=headers),
        client.post(f"/api/resumes/{rid}/analyze", headers=headers),
    ):
        assert resp.status_code == 200, resp.text
        _assert_no_email_leak(resp.json(), email)
