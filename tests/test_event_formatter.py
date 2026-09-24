from datetime import datetime, timezone

from density import DensitySignal
from event_formatter import (
    build_event,
    density_to_event,
    detection_to_event,
    hazard_to_event,
)
from pedestrian_safety import HazardSignal
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


def test_density_to_event():
    signal = DensitySignal(
        level="heavy",
        average_count=14.5,
        vehicle_count=15,
        counts_by_class={"car": 12, "bus": 3},
        confidence=0.81,
    )

    gps = GPSPoint(
        lat=19.0760,
        lng=72.8777,
    )

    timestamp = datetime(
        2026, 9, 13, 10, 30, 0,
        tzinfo=timezone.utc,
    )

    event = density_to_event(
        signal=signal,
        gps=gps,
        timestamp=timestamp,
    )

    assert event["type"] == "traffic_density"
    assert event["subtype"] == "heavy"
    assert event["confidence"] == 0.81
    assert event["timestamp"] == "2026-09-13T10:30:00+00:00"
    assert event["gps"] == {"lat": 19.0760, "lng": 72.8777}
    assert event["bus_id"]


def test_event_payload_keys_match_backend_contract():
    gps = GPSPoint(lat=19.0760, lng=72.8777)

    event = build_event(
        event_type="traffic_density",
        subtype="moderate",
        confidence=0.7,
        gps=gps,
    )

    assert set(event) == {
        "type",
        "subtype",
        "confidence",
        "timestamp",
        "gps",
        "bus_id",
        "route_id",
        "camera_id",
    }


def test_hazard_to_event():
    signal = HazardSignal(
        subtype="close_pedestrian",
        pedestrian_count=2,
        confidence=0.77,
        closest_height_ratio=0.6,
    )

    gps = GPSPoint(lat=19.0760, lng=72.8777)

    event = hazard_to_event(signal=signal, gps=gps)

    assert event["type"] == "pedestrian_hazard"
    assert event["subtype"] == "close_pedestrian"
    assert event["confidence"] == 0.77
