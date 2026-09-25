import numpy as np

from detectors.vehicle_detector import (
    MockVehicleDetector,
    YoloVehicleDetector,
    build_vehicle_detector,
    count_by_class,
    normalize_vehicle_class,
)
from detectors.base import Detection


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


def make_frame(width=640, height=480):
    return np.zeros((height, width, 3), dtype=np.uint8)


def test_normalize_coco_labels_collapse_to_4_wheeler():
    assert normalize_vehicle_class("Car") == "4-wheeler"
    assert normalize_vehicle_class("bus") == "4-wheeler"
    assert normalize_vehicle_class("truck") == "4-wheeler"


def test_normalize_coco_labels_collapse_to_2_wheeler():
    assert normalize_vehicle_class("motorcycle") == "2-wheeler"
    assert normalize_vehicle_class("motorbike") == "2-wheeler"
    assert normalize_vehicle_class("bicycle") == "2-wheeler"
    assert normalize_vehicle_class("two wheeler") == "2-wheeler"


def test_normalize_canonical_labels_pass_through_unchanged():
    # M2's real model output (or anything already in the canonical
    # taxonomy) must pass through unchanged.
    assert normalize_vehicle_class("2-wheeler") == "2-wheeler"
    assert normalize_vehicle_class("3-wheeler") == "3-wheeler"
    assert normalize_vehicle_class("4-wheeler") == "4-wheeler"


def test_normalize_non_vehicle_returns_none():
    assert normalize_vehicle_class("person") is None
    assert normalize_vehicle_class("traffic light") is None


def test_count_by_class_counts_every_class():
    detections = [
        Detection("4-wheeler", 0.9, (0, 0, 1, 1)),
        Detection("4-wheeler", 0.9, (0, 0, 1, 1)),
        Detection("2-wheeler", 0.8, (0, 0, 1, 1)),
    ]

    counts = count_by_class(detections)

    assert counts == {
        "2-wheeler": 1,
        "3-wheeler": 0,
        "4-wheeler": 2,
    }


def test_count_by_class_ignores_unknown_classes():
    detections = [Detection("pothole", 0.9, (0, 0, 1, 1))]

    assert sum(count_by_class(detections).values()) == 0


def test_yolo_vehicle_detector_classifies_vehicles():
    detector = YoloVehicleDetector(
        confidence_threshold=0.4,
        model=FakeModel(
            names={0: "car", 1: "motorcycle", 2: "person"},
            boxes=[
                FakeBox(0, 0.9, (0, 0, 10, 10)),
                FakeBox(1, 0.7, (20, 20, 30, 30)),
                FakeBox(2, 0.95, (40, 40, 50, 50)),
            ],
        ),
    )

    detections = detector.detect(make_frame())

    assert [d.class_name for d in detections] == ["4-wheeler", "2-wheeler"]


def test_mock_vehicle_detector_cycles_counts():
    detector = MockVehicleDetector(counts=(2, 4))
    frame = make_frame()

    assert len(detector.detect(frame)) == 2
    assert len(detector.detect(frame)) == 4
    assert len(detector.detect(frame)) == 2


def test_mock_vehicle_detector_boxes_stay_inside_frame():
    detector = MockVehicleDetector(counts=(9,))

    for detection in detector.detect(make_frame(640, 480)):
        x1, y1, x2, y2 = detection.bbox

        assert 0 <= x1 < x2 <= 640
        assert 0 <= y1 < y2 <= 480


def test_build_vehicle_detector_modes():
    assert isinstance(build_vehicle_detector("mock"), MockVehicleDetector)
    assert isinstance(build_vehicle_detector("yolo"), YoloVehicleDetector)
