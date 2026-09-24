from detectors.mock_detector import MockDetector
from detectors.road_defect_detector import (
    YoloRoadDefectDetector,
    build_road_defect_detector,
    normalize_defect_class,
)


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
    """Stands in for ultralytics.YOLO so tests need no weights."""

    def __init__(self, names, boxes):
        self.names = names
        self.boxes = boxes
        self.calls = []

    def predict(self, frame, conf=0.25, verbose=False):
        self.calls.append(conf)

        return [FakeResult(self.names, self.boxes)]


def make_detector(names, boxes, confidence_threshold=0.3):
    return YoloRoadDefectDetector(
        confidence_threshold=confidence_threshold,
        model=FakeModel(names, boxes),
    )


def test_normalize_known_labels():
    assert normalize_defect_class("Pothole") == "pothole"
    assert normalize_defect_class("D40") == "pothole"
    assert normalize_defect_class("alligator-crack") == "damaged_road"
    assert normalize_defect_class("water logging") == "waterlogging"


def test_normalize_canonical_names_round_trip():
    assert normalize_defect_class("missing_zebra_crossing") == (
        "missing_zebra_crossing"
    )
    assert normalize_defect_class("missing_divider") == "missing_divider"
    assert normalize_defect_class("damaged_signboard") == "damaged_signboard"


def test_normalize_unknown_label_returns_none():
    assert normalize_defect_class("person") is None


def test_yolo_detector_returns_detections():
    detector = make_detector(
        names={0: "pothole"},
        boxes=[FakeBox(0, 0.88, (10, 20, 30, 40))],
    )

    detections = detector.detect(frame=None)

    assert len(detections) == 1
    assert detections[0].class_name == "pothole"
    assert detections[0].confidence == 0.88
    assert detections[0].bbox == (10.0, 20.0, 30.0, 40.0)


def test_yolo_detector_maps_dataset_labels_to_subtypes():
    detector = make_detector(
        names={0: "D40", 1: "D20"},
        boxes=[
            FakeBox(0, 0.7, (0, 0, 10, 10)),
            FakeBox(1, 0.6, (20, 20, 30, 30)),
        ],
    )

    subtypes = [d.class_name for d in detector.detect(frame=None)]

    assert subtypes == ["pothole", "damaged_road"]


def test_yolo_detector_drops_non_defect_classes():
    detector = make_detector(
        names={0: "person", 1: "pothole"},
        boxes=[
            FakeBox(0, 0.95, (0, 0, 10, 10)),
            FakeBox(1, 0.5, (20, 20, 30, 30)),
        ],
    )

    detections = detector.detect(frame=None)

    assert len(detections) == 1
    assert detections[0].class_name == "pothole"


def test_yolo_detector_drops_low_confidence_boxes():
    detector = make_detector(
        names={0: "pothole"},
        boxes=[FakeBox(0, 0.1, (0, 0, 10, 10))],
        confidence_threshold=0.5,
    )

    assert detector.detect(frame=None) == []


def test_yolo_detector_loads_model_once():
    detector = make_detector(
        names={0: "pothole"},
        boxes=[FakeBox(0, 0.9, (0, 0, 10, 10))],
    )

    detector.detect(frame=None)
    detector.detect(frame=None)

    assert len(detector.model.calls) == 2


def test_build_detector_defaults_to_mock():
    assert isinstance(build_road_defect_detector("mock"), MockDetector)


def test_build_detector_yolo_mode_does_not_load_weights():
    detector = build_road_defect_detector("yolo")

    assert isinstance(detector, YoloRoadDefectDetector)
    assert detector.model is None
