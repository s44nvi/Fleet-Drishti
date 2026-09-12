import requests

API_URL = "http://127.0.0.1:8000"

EMAIL = "admin@citylens.com"
PASSWORD = "admin123"


def get_token():
    response = requests.post(
        f"{API_URL}/auth/login",
        json={
            "email": EMAIL,
            "password": PASSWORD,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"

    return data["access_token"]


def test_health():
    response = requests.get(f"{API_URL}/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login():
    token = get_token()

    assert token


def test_fleet_buses():
    token = get_token()

    response = requests.get(
        f"{API_URL}/buses",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_routes():
    token = get_token()

    response = requests.get(
        f"{API_URL}/routes",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_issues():
    token = get_token()

    response = requests.get(
        f"{API_URL}/issues",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_analytics():
    token = get_token()

    response = requests.get(
        f"{API_URL}/analytics",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert isinstance(response.json(), dict)