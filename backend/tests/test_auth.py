def test_register_and_me_flow(client):
    payload = {
        "name": "Jane Student",
        "email": "jane@example.com",
        "password": "secret123",
        "college": "Example College",
        "degree": "B.Tech",
        "department": "CSE",
        "year": "3rd Year",
        "phone": "9876543210",
    }

    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["token"]
    assert body["user"]["email"] == payload["email"]
    assert body["user"]["role"] == "student"
    assert "password" not in body["user"]

    me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {body['token']}"},
    )
    assert me.status_code == 200, me.text
    assert me.json()["user"]["email"] == payload["email"]


def test_login_rejects_bad_password(client):
    register = client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": "a@example.com",
            "password": "correct123",
            "college": "College",
        },
    )
    assert register.status_code == 200

    response = client.post(
        "/api/auth/login",
        json={"email": "a@example.com", "password": "wrong-pass"},
    )
    assert response.status_code == 401
