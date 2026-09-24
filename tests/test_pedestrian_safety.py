from detectors.base import Detection
from detectors.pedestrian_detector import (
    MockPedestrianDetector,
    YoloPedestrianDetector,
    build_pedestrian_detector,
    normalize_pedestrian_class,
)
from pedestrian_safety import (
    PedestrianHazardMonitor,
    height_ratio,
    in_bus_path,
)


FRAME_SHAPE = (480, 640, 3)


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


def make_pedestrian(
    center_x=320,
    top=260,
    bottom=440,
    confidence=0.85,
):
    return Detection(
        class_name="pedestrian",
        confidence=confidence,
        bbox=(center_x - 20, top, center_x + 20, bottom),
    )


def test_normalize_person_label():
    assert normalize_pedestrian_class("person") == "pedestrian"
    assert normalize_pedestrian_class("car") is None


def test_yolo_pedestrian_detector_keeps_only_people():
    detector = YoloPedestrianDetector(
        confidence_threshold=0.4,
        model=FakeModel(
            names={0: "person", 1: "car"},
            boxes=[
                FakeBox(0, 0.9, (0, 0, 10, 10)),
                FakeBox(1, 0.9, (20, 20, 30, 30)),
            ],
        ),
    )

    detections = detector.detect(frame=None)

    assert len(detections) == 1
    assert detections[0].class_name == "pedestrian"


def test_pedestrian_in_middle_of_frame_is_in_bus_path():
    assert in_bus_path(make_pedestrian(center_x=320), 640, 480) is True


def test_pedestrian_on_footpath_is_not_in_bus_path():
    assert in_bus_path(make_pedestrian(center_x=40), 640, 480) is False
    assert in_bus_path(make_pedestrian(center_x=620), 640, 480) is False


def test_pedestrian_above_horizon_is_not_in_bus_path():
    far = make_pedestrian(top=20, bottom=100)

    assert in_bus_path(far, 640, 480) is False


def test_height_ratio():
    pedestrian = make_pedestrian(top=240, bottom=480)

    assert height_ratio(pedestrian, 480) == 0.5


def test_no_hazard_when_nobody_in_path():
    monitor = PedestrianHazardMonitor()

    signal = monitor.update(
        [make_pedestrian(center_x=30)],
        0.0,
        FRAME_SHAPE,
    )

    assert signal is None


def test_single_pedestrian_ahead_emits_crossing_ahead():
    monitor = PedestrianHazardMonitor()

    signal = monitor.update(
        [make_pedestrian(top=300, bottom=400)],
        0.0,
        FRAME_SHAPE,
    )

    assert signal is not None
    assert signal.subtype == "crossing_ahead"
    assert signal.pedestrian_count == 1
    assert signal.confidence == 0.85


def test_group_in_path_emits_group_crossing():
    monitor = PedestrianHazardMonitor(group_size=3)

    group = [
        make_pedestrian(center_x=x, top=300, bottom=400)
        for x in (260, 320, 380)
    ]

    signal = monitor.update(group, 0.0, FRAME_SHAPE)

    assert signal.subtype == "group_crossing"
    assert signal.pedestrian_count == 3


def test_close_pedestrian_outranks_group():
    monitor = PedestrianHazardMonitor(
        close_height_ratio=0.45,
        group_size=3,
    )

    group = [
        make_pedestrian(center_x=x, top=100, bottom=460)
        for x in (260, 320, 380)
    ]

    signal = monitor.update(group, 0.0, FRAME_SHAPE)

    assert signal.subtype == "close_pedestrian"


def test_repeat_hazard_is_suppressed_within_gap():
    monitor = PedestrianHazardMonitor(min_gap_seconds=5.0)
    pedestrian = make_pedestrian(top=300, bottom=400)

    first = monitor.update([pedestrian], 0.0, FRAME_SHAPE)
    second = monitor.update([pedestrian], 1.0, FRAME_SHAPE)
    later = monitor.update([pedestrian], 6.0, FRAME_SHAPE)

    assert first is not None
    assert second is None
    assert later is not None


def test_escalation_emits_immediately():
    monitor = PedestrianHazardMonitor(min_gap_seconds=60.0)

    far = make_pedestrian(top=300, bottom=400)
    close = make_pedestrian(top=100, bottom=460)

    assert monitor.update([far], 0.0, FRAME_SHAPE).subtype == (
        "crossing_ahead"
    )
    assert monitor.update([close], 1.0, FRAME_SHAPE).subtype == (
        "close_pedestrian"
    )


def test_de_escalation_is_suppressed_within_gap():
    monitor = PedestrianHazardMonitor(min_gap_seconds=60.0)

    close = make_pedestrian(top=100, bottom=460)
    far = make_pedestrian(top=300, bottom=400)

    monitor.update([close], 0.0, FRAME_SHAPE)

    assert monitor.update([far], 1.0, FRAME_SHAPE) is None


def test_build_pedestrian_detector_modes():
    assert isinstance(
        build_pedestrian_detector("mock"),
        MockPedestrianDetector,
    )
    assert isinstance(
        build_pedestrian_detector("yolo"),
        YoloPedestrianDetector,
    )
