from datetime import datetime, timezone

from event_formatter import detection_to_event
from detectors.base import Detection
from gps_provider import GPSPoint


def test_detection_to_event():
    detection = Detection(
        class_name="pothole",
        confidence=0.92,
        bbox=(100, 100, 200, 200),
    )

    gps = GPSPoint(
        lat=19.0760,
        lng=72.8777,
    )

    timestamp = datetime(
        2026, 9, 13, 10, 30, 0,
        tzinfo=timezone.utc,
    )

    event = detection_to_event(
        detection=detection,
        gps=gps,
        timestamp=timestamp,
    )

    assert event["type"] == "road_defect"
    assert event["subtype"] == "pothole"
    assert event["confidence"] == 0.92
    assert event["timestamp"] == "2026-09-13T10:30:00+00:00"
    assert event["gps"]["lat"] == 19.0760
    assert event["gps"]["lng"] == 72.8777
    assert event["bus_id"]
    assert event["route_id"]
    assert event["camera_id"]
