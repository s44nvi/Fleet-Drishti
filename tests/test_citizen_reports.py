import requests
from datetime import datetime

API_URL = "http://127.0.0.1:8000"


def get_token():
    response = requests.post(
        f"{API_URL}/auth/login",
        json={
            "email": "admin@citylens.com",
            "password": "admin123",
        },
    )

    assert response.status_code == 200

    return response.json()["access_token"]


def test_create_and_get_citizen_report():
    token = get_token()

    payload = {
        "description": "Large pothole reported by citizen",
        "photo_path": "reports/photos/test-report.jpg",
        "video_path": "reports/videos/test-report.mp4",
        "timestamp": datetime.now().replace(microsecond=0).isoformat(),
        "gps": {
            "lat": 19.0761,
            "lng": 72.8778,
        },
    }

    create_response = requests.post(
        f"{API_URL}/citizen-reports",
        json=payload,
    )

    assert create_response.status_code == 201

    report = create_response.json()

    assert report["description"] == payload["description"]
    assert report["photo_path"] == payload["photo_path"]
    assert report["video_path"] == payload["video_path"]
    assert report["lat"] == payload["gps"]["lat"]
    assert report["lng"] == payload["gps"]["lng"]
    assert report["status"] == "submitted"
    assert report["matched_issue_id"] is None

    report_id = report["id"]

    get_response = requests.get(
        f"{API_URL}/citizen-reports",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert get_response.status_code == 200

    reports = get_response.json()

    assert isinstance(reports, list)
    assert any(report["id"] == report_id for report in reports)