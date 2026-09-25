def test_login_success(client):
    res = client.post("/api/auth/login", json={"email": "admin@doa.local", "password": "Admin@123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={"email": "admin@doa.local", "password": "WrongPassword"})
    assert res.status_code == 401

def test_get_me_authenticated(client, user_token):
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "user@doa.local"
    assert data["role"] == "NORMAL_USER"

def test_get_me_unauthorized(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 403 or res.status_code == 401
