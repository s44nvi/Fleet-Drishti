from datetime import datetime, timezone

from detectors.base import Detection
from detectors.helmet_detector import (
    NO_HELMET,
    WITH_HELMET,
    YoloHelmetDetector,
    normalize_helmet_class,
)
from event_formatter import helmet_to_event
from gps_provider import GPSPoint


class FakeBox:
    def __init__(self, class_id, confidence, bbox):
        self.cls = [class_id]
        self.conf = [confidence]
        self.xyxy = [list(bbox)]


class FakeResult:
    def __init__(self, names, boxes):
        self.names = names
        self.boxes = boxes


class FakeModel:
    def __init__(self, names, boxes):
        self.names = names
        self.boxes = boxes

    def predict(self, frame, conf=0.25, verbose=False):
        return [FakeResult(self.names, self.boxes)]


NAMES = {0: "With Helmet", 1: "Without Helmet", 2: "Something Else"}


def test_normalize_helmet_labels():
    assert normalize_helmet_class("With Helmet") == WITH_HELMET
    assert normalize_helmet_class("Without Helmet") == NO_HELMET
    assert normalize_helmet_class("without_helmet") == NO_HELMET
    assert normalize_helmet_class("person") is None


def test_detector_maps_and_filters_classes():
    detector = YoloHelmetDetector(
        confidence_threshold=0.4,
        model=FakeModel(
            NAMES,
            [
                FakeBox(0, 0.9, (0, 0, 10, 10)),
                FakeBox(1, 0.6, (20, 20, 30, 30)),
                FakeBox(2, 0.9, (40, 40, 50, 50)),
                FakeBox(1, 0.2, (60, 60, 70, 70)),
            ],
        ),
    )

    detections = detector.detect(frame=None)

    assert [d.class_name for d in detections] == [WITH_HELMET, NO_HELMET]


def test_helmet_event_is_safety_violation_no_helmet():
    detection = Detection(
        class_name=NO_HELMET,
        confidence=0.66,
        bbox=(0, 0, 10, 10),
    )

    event = helmet_to_event(
        detection,
        GPSPoint(lat=19.1, lng=72.9),
        datetime(2026, 9, 13, 10, 30, tzinfo=timezone.utc),
    )

    assert event["type"] == "safety_violation"
    assert event["subtype"] == "no_helmet"
    assert event["confidence"] == 0.66
    assert event["gps"] == {"lat": 19.1, "lng": 72.9}
