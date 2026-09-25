import random
import requests
from datetime import datetime

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


def create_event(token, bus_id, route_id, camera_id, timestamp, lat, lng, confidence):
    response = requests.post(
        f"{API_URL}/events",
        json={
            "type": "road_defect",
            "subtype": "pothole",
            "confidence": confidence,
            "timestamp": timestamp,
            "gps": {
                "lat": lat,
                "lng": lng,
            },
            "bus_id": bus_id,
            "route_id": route_id,
            "camera_id": camera_id,
        },
        headers={
            "Authorization": f"Bearer {token}",
        },
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


def test_event_creates_and_fuses_into_issue():
    """
    A single road_defect event posted to /events should:
    - be accepted (201) with a real event id
    - get fused into a persistent Issue (issue_id set, not dropped)
    - that Issue's fields (confidence/priority/observation_count)
      should be sane
    """
    token = get_token()
    base_time = datetime.now().replace(microsecond=0)
    # Fresh random spot each run so this doesn't collide with an issue
    # left by a prior run (MATCH_DISTANCE_METERS is 50m).
    lat = 19.0761 + random.uniform(-0.01, 0.01)
    lng = 72.8778 + random.uniform(-0.01, 0.01)

    event = create_event(
        token, BUS_1, ROUTE_1, CAMERA_1,
        base_time.isoformat(), lat, lng, 0.88,
    )

    assert event["id"] is not None
    assert event["issue_id"] is not None

    issue = get_issue(token, event["issue_id"])

    assert issue["id"] == event["issue_id"]
    assert 0.0 <= issue["confidence"] <= 1.0
    assert 0.0 <= issue["priority"] <= 100.0
    assert issue["observation_count"] >= 1
