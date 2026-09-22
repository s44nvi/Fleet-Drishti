import random
import requests
from datetime import datetime, timedelta

API_URL = "http://127.0.0.1:8000"

BUS_1 = "fff745f2-138e-47e2-a9dd-b7dd43e13621"
ROUTE_1 = "76322705-b364-4cc1-9e0f-d2182c755856"
CAMERA_1 = "783ecb97-91f5-414a-ab4d-3ac2b930f4a5"


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
    # NOTE: this location was updated as part of the fusion rewrite.
    # 19.0761/72.8778 is reused across several other tests/scripts
    # (e.g. test_event_flow.py) as an issue location, and citizen
    # reports now DO spatially match against existing issues, so the
    # old coordinates could non-deterministically pick up a match
    # depending on test order. This test is about the basic
    # create/list contract, not matching, so it uses an isolated spot.
    token = get_token()

    payload = {
        "description": "Large pothole reported by citizen",
        "photo_path": "reports/photos/test-report.jpg",
        "video_path": "reports/videos/test-report.mp4",
        "timestamp": datetime.now().replace(microsecond=0).isoformat(),
        "gps": {
            "lat": -33.9000,
            "lng": 151.2000,
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


def create_event(token, lat, lng, timestamp, confidence=0.9):
    response = requests.post(
        f"{API_URL}/events",
        json={
            "type": "road_defect",
            "subtype": "pothole",
            "confidence": confidence,
            "timestamp": timestamp,
            "gps": {"lat": lat, "lng": lng},
            "bus_id": BUS_1,
            "route_id": ROUTE_1,
            "camera_id": CAMERA_1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    return response.json()


def get_issue(token, issue_id):
    response = requests.get(
        f"{API_URL}/issues/{issue_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    return response.json()


def test_citizen_report_matches_and_contributes_to_issue():
    token = get_token()
    base_time = datetime.now().replace(microsecond=0)
    # DB persists between runs; pick a fresh random spot each run.
    lat = 19.3000 + random.uniform(-0.01, 0.01)
    lng = 73.0500 + random.uniform(-0.01, 0.01)

    event = create_event(token, lat, lng, base_time.isoformat())
    issue_id = event["issue_id"]
    confidence_before = get_issue(token, issue_id)["confidence"]

    payload = {
        "description": "Confirming the pothole here too",
        "timestamp": (base_time + timedelta(minutes=1)).isoformat(),
        "gps": {"lat": lat + 0.00003, "lng": lng + 0.00003},
    }

    response = requests.post(f"{API_URL}/citizen-reports", json=payload)
    assert response.status_code == 201

    report = response.json()
    assert report["matched_issue_id"] == issue_id

    confidence_after = get_issue(token, issue_id)["confidence"]
    assert confidence_after > confidence_before


def test_citizen_report_no_match_leaves_matched_issue_id_null():
    payload = {
        "description": "Middle of nowhere, no nearby issue",
        "timestamp": datetime.now().replace(microsecond=0).isoformat(),
        "gps": {"lat": -1.0, "lng": -1.0},
    }

    response = requests.post(f"{API_URL}/citizen-reports", json=payload)
    assert response.status_code == 201

    report = response.json()
    assert report["matched_issue_id"] is None