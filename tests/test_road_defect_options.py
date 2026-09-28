import numpy as np

from detectors.road_defect_detector import YoloRoadDefectDetector


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
    def __init__(self, boxes):
        self.boxes = boxes
        self.kwargs = []

    def predict(self, frame, conf=0.25, verbose=False, **kwargs):
        self.kwargs.append(kwargs)

        return [FakeResult({0: "Pothole"}, self.boxes)]


FRAME = np.zeros((1000, 2000, 3), dtype=np.uint8)

SKY_BOX = FakeBox(0, 0.7, (500, 0, 1000, 300))
ROAD_BOX = FakeBox(0, 0.5, (900, 800, 1000, 900))


def test_default_keeps_everything_and_does_not_pass_imgsz():
    model = FakeModel([SKY_BOX, ROAD_BOX])
    detector = YoloRoadDefectDetector(model=model)

    detections = detector.detect(FRAME)

    assert [d.class_name for d in detections] == ["pothole", "pothole"]
    assert model.kwargs == [{}]


def test_min_center_y_drops_detections_above_the_road():
    detector = YoloRoadDefectDetector(
        model=FakeModel([SKY_BOX, ROAD_BOX]),
        min_center_y=0.5,
    )

    detections = detector.detect(FRAME)

    assert len(detections) == 1
    assert detections[0].bbox[1] == 800


def test_imgsz_is_passed_to_the_model_when_set():
    model = FakeModel([ROAD_BOX])
    detector = YoloRoadDefectDetector(model=model, imgsz=960)

    detector.detect(FRAME)

    assert model.kwargs == [{"imgsz": 960}]
