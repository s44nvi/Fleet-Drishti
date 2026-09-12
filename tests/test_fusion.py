import requests
from datetime import datetime, timedelta

API_URL = "http://127.0.0.1:8000"

EMAIL = "admin@citylens.com"
PASSWORD = "admin123"

BUS_1 = "fff745f2-138e-47e2-a9dd-b7dd43e13621"
ROUTE_1 = "76322705-b364-4cc1-9e0f-d2182c755856"
CAMERA_1 = "783ecb97-91f5-414a-ab4d-3ac2b930f4a5"

BUS_2 = "312f8278-5bd1-493e-81a6-f678ed74795e"
ROUTE_2 = "7f974462-2d79-43dd-b2e9-c4e014778eb3"
CAMERA_2 = "273194d5-0b98-4ec2-9b53-00afbcb509d5"


def get_token():
    response = requests.post(
        f"{API_URL}/auth/login",
        json={
            "email": EMAIL,
            "password": PASSWORD,
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


def test_second_bus_observation_reuses_same_issue():
    token = get_token()

    base_time = datetime.now().replace(microsecond=0)

    first_event = create_event(
        token,
        BUS_1,
        ROUTE_1,
        CAMERA_1,
        base_time.isoformat(),
        19.0800,
        72.8800,
        0.90,
    )

    second_event = create_event(
        token,
        BUS_2,
        ROUTE_2,
        CAMERA_2,
        (base_time + timedelta(minutes=5)).isoformat(),
        19.0801,
        72.8801,
        0.88,
    )

    assert first_event["id"] != second_event["id"]

    assert first_event["issue_id"] is not None
    assert second_event["issue_id"] is not None

    assert first_event["issue_id"] == second_event["issue_id"]