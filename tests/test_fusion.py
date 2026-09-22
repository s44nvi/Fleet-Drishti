import random
import requests
from datetime import datetime, timedelta

from app.services.issue_service import fuse_confidence, calculate_priority
from app.models.core import Issue

API_URL = "http://127.0.0.1:8000"

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


# ---------------------------------------------------------------------
# Pure math tests: exact noisy-OR verification, no server/DB required.
# ---------------------------------------------------------------------

def test_noisy_or_first_observation_new_observer():
    # C_1 = 1 - (1 - 0) * (1 - 0.9 * 1.0) = 0.9
    result = fuse_confidence(0.0, 0.9, 1.0)
    assert result == round(0.9, 4)


def test_noisy_or_second_observation_new_observer():
    # Use moderate confidences so the CONFIDENCE_CAP (0.97) doesn't
    # bind, keeping this an exact-math check of the raw formula.
    c1 = fuse_confidence(0.0, 0.6, 1.0)  # 0.6
    # c_2 = 0.5 * 1.0 = 0.5
    # C_2 = 1 - (1 - 0.6) * (1 - 0.5) = 1 - 0.4 * 0.5 = 0.8
    c2 = fuse_confidence(c1, 0.5, 1.0)
    expected = round(1 - (1 - 0.6) * (1 - 0.5), 4)
    assert c2 == expected


def test_noisy_or_same_bus_repeat_weight():
    c1 = fuse_confidence(0.0, 0.6, 1.0)  # 0.6
    # same-bus repeat: c_n = 0.6 * 0.3 = 0.18
    # C_2 = 1 - (1 - 0.6) * (1 - 0.18) = 1 - 0.4 * 0.82 = 0.672
    c2 = fuse_confidence(c1, 0.6, 0.3)
    expected = round(1 - (1 - 0.6) * (1 - 0.18), 4)
    assert c2 == expected
    # Same-bus repeat contributes noticeably less than a new observer.
    c2_new_observer = fuse_confidence(c1, 0.6, 1.0)
    assert c2 < c2_new_observer


def test_noisy_or_third_observation_sequential():
    c1 = fuse_confidence(0.0, 0.6, 1.0)
    c2 = fuse_confidence(c1, 0.5, 1.0)
    c3 = fuse_confidence(c2, 0.4, 0.3)  # third: same-bus repeat

    c3_n = 0.4 * 0.3
    expected = round(1 - (1 - c2) * (1 - c3_n), 4)
    assert c3 == expected
    # Confidence should be monotonically non-decreasing.
    assert c1 <= c2 <= c3


def test_noisy_or_cap_prevents_reaching_one():
    confidence = 0.0
    for _ in range(50):
        confidence = fuse_confidence(confidence, 0.99, 1.0)

    assert confidence < 1.0
    assert confidence <= 0.97  # CONFIDENCE_CAP


def test_priority_distinct_from_confidence():
    issue = Issue(
        type="road_defect",
        subtype="pothole",
        lat=19.08,
        lng=72.88,
        first_seen=datetime.utcnow(),
        last_seen=datetime.utcnow(),
    )

    priority_low_conf = calculate_priority(issue, confidence=0.1, repeat_observation=False)
    priority_high_conf = calculate_priority(issue, confidence=0.95, repeat_observation=False)

    # Priority moves with confidence but is not equal to it (not aliased).
    assert priority_high_conf > priority_low_conf
    assert priority_high_conf != 0.95
    assert priority_low_conf != 0.1


def test_priority_incorporates_repeat_and_traffic_and_age():
    old_issue = Issue(
        type="road_defect",
        subtype="pothole",
        lat=19.08,
        lng=72.88,
        first_seen=datetime.utcnow() - timedelta(days=5),
        last_seen=datetime.utcnow(),
    )

    fresh_issue = Issue(
        type="road_defect",
        subtype="pothole",
        lat=19.08,
        lng=72.88,
        first_seen=datetime.utcnow(),
        last_seen=datetime.utcnow(),
    )

    p_repeat = calculate_priority(
        fresh_issue, confidence=0.8, repeat_observation=True, observation_count=4
    )
    p_no_repeat = calculate_priority(
        fresh_issue, confidence=0.8, repeat_observation=False, observation_count=1
    )
    assert p_repeat > p_no_repeat

    p_high_traffic = calculate_priority(
        fresh_issue, confidence=0.8, traffic_exposure=1.0
    )
    p_low_traffic = calculate_priority(
        fresh_issue, confidence=0.8, traffic_exposure=0.0
    )
    assert p_high_traffic > p_low_traffic

    p_old = calculate_priority(old_issue, confidence=0.8)
    p_new = calculate_priority(fresh_issue, confidence=0.8)
    assert p_old > p_new


# ---------------------------------------------------------------------
# End-to-end fusion tests through the API.
# ---------------------------------------------------------------------

def test_second_bus_observation_reuses_same_issue():
    token = get_token()

    base_time = datetime.now().replace(microsecond=0)

    first_event = create_event(
        token, BUS_1, ROUTE_1, CAMERA_1,
        base_time.isoformat(), 19.0800, 72.8800, 0.90,
    )

    second_event = create_event(
        token, BUS_2, ROUTE_2, CAMERA_2,
        (base_time + timedelta(minutes=5)).isoformat(), 19.0801, 72.8801, 0.88,
    )

    assert first_event["id"] != second_event["id"]
    assert first_event["issue_id"] is not None
    assert second_event["issue_id"] is not None
    assert first_event["issue_id"] == second_event["issue_id"]


def test_noisy_or_fusion_persisted_on_issue_end_to_end():
    """
    Three sequential observations at a fresh location:
    1. BUS_1 (new observer, weight 1.0)
    2. BUS_2 (new observer, weight 1.0)
    3. BUS_1 again within 24h (same-bus repeat, weight 0.3)

    Verifies Issue.confidence matches the exact noisy-OR computation
    and is persisted/retrievable via GET /issues/{id}.
    """
    token = get_token()
    base_time = datetime.now().replace(microsecond=0)
    # The test DB persists between runs, so pick a fresh random spot
    # each run to avoid colliding with an issue left by a prior run
    # (MATCH_DISTANCE_METERS is 50m, so +-0.01 deg is comfortably far).
    lat = 19.2000 + random.uniform(-0.01, 0.01)
    lng = 72.9500 + random.uniform(-0.01, 0.01)

    # Moderate confidences are used so CONFIDENCE_CAP (0.97) doesn't
    # bind, keeping this an exact-math check end to end.
    e1 = create_event(
        token, BUS_1, ROUTE_1, CAMERA_1,
        base_time.isoformat(), lat, lng, 0.60,
    )
    issue_id = e1["issue_id"]
    c1 = get_issue(token, issue_id)["confidence"]
    assert c1 == fuse_confidence(0.0, 0.60, 1.0)

    e2 = create_event(
        token, BUS_2, ROUTE_2, CAMERA_2,
        (base_time + timedelta(minutes=5)).isoformat(), lat + 0.00005, lng + 0.00005, 0.50,
    )
    assert e2["issue_id"] == issue_id
    c2 = get_issue(token, issue_id)["confidence"]
    assert c2 == fuse_confidence(c1, 0.50, 1.0)

    e3 = create_event(
        token, BUS_1, ROUTE_1, CAMERA_1,
        (base_time + timedelta(minutes=10)).isoformat(), lat, lng, 0.40,
    )
    assert e3["issue_id"] == issue_id
    c3 = get_issue(token, issue_id)["confidence"]
    assert c3 == fuse_confidence(c2, 0.40, 0.3)

    # Confidence should have increased with each confirmation.
    assert c1 < c2 < c3
