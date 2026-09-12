import requests
from datetime import datetime

API_URL = "http://127.0.0.1:8000"

EMAIL = "admin@citylens.com"
PASSWORD = "admin123"

BUS_ID = "312f8278-5bd1-493e-81a6-f678ed74795e"
ROUTE_ID = "7f974462-2d79-43dd-b2e9-c4e014778eb3"
CAMERA_ID = "273194d5-0b98-4ec2-9b53-00afbcb509d5"


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


def create_test_event(token):
    response = requests.post(
        f"{API_URL}/events",
        json={
            "type": "road_defect",
            "subtype": "pothole",
            "confidence": 0.87,
            "timestamp": datetime.now().replace(microsecond=0).isoformat(),
            "gps": {
                "lat": 19.0900,
                "lng": 72.8900,
            },
            "bus_id": BUS_ID,
            "route_id": ROUTE_ID,
            "camera_id": CAMERA_ID,
        },
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 201

    return response.json()


def test_create_and_get_evidence():
    token = get_token()

    event = create_test_event(token)

    response = requests.post(
        f"{API_URL}/evidence",
        json={
            "event_id": event["id"],
            "frame_path": "evidence/frames/test-frame.jpg",
            "video_path": "evidence/videos/test-clip.mp4",
            "timestamp": event["timestamp"],
            "gps": {
                "lat": event["lat"],
                "lng": event["lng"],
            },
            "bus_id": BUS_ID,
            "route_id": ROUTE_ID,
            "confidence": 0.87,
        },
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 201

    evidence = response.json()

    assert evidence["event_id"] == event["id"]
    assert evidence["frame_path"] == "evidence/frames/test-frame.jpg"
    assert evidence["video_path"] == "evidence/videos/test-clip.mp4"

    evidence_id = evidence["id"]

    get_response = requests.get(
        f"{API_URL}/evidence/{evidence_id}",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert get_response.status_code == 200

    fetched_evidence = get_response.json()

    assert fetched_evidence["id"] == evidence_id
    assert fetched_evidence["event_id"] == event["id"]