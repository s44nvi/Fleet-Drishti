"""
Pedestrian detection.

COCO-pretrained YOLO detects "person", which is all this detector
reports. Whether a person is a hazard is decided in pedestrian_safety.py
from where they are in the frame, not by the model.

TODO: telling school children from adults needs fine-tuned weights
(uniform / satchel / height cues). Until then a group of pedestrians in
the bus path is reported as "group_crossing", which is the situation we
actually care about.
"""
from itertools import cycle

from config import (
    DETECTOR_MODE,
    PEDESTRIAN_CONFIDENCE,
    PEDESTRIAN_MODEL_PATH,
)
from detectors.base import Detection, Detector
from detectors.yolo_backend import load_model, run_model


PEDESTRIAN_CLASS = "pedestrian"

PEDESTRIAN_ALIASES = {
    "person": PEDESTRIAN_CLASS,
    "people": PEDESTRIAN_CLASS,
    "pedestrian": PEDESTRIAN_CLASS,
}


def normalize_pedestrian_class(label: str) -> str | None:
    key = label.strip().lower().replace("_", " ").replace("-", " ")
    key = " ".join(key.split())

    return PEDESTRIAN_ALIASES.get(key)


class YoloPedestrianDetector(Detector):
    def __init__(
        self,
        weights_path: str = PEDESTRIAN_MODEL_PATH,
        confidence_threshold: float = PEDESTRIAN_CONFIDENCE,
        model=None,
    ):
        self.weights_path = weights_path
        self.confidence_threshold = confidence_threshold
        self.model = model

    def _ensure_model(self):
        if self.model is None:
            self.model = load_model(self.weights_path)

        return self.model

    def detect(self, frame) -> list[Detection]:
        boxes = run_model(
            self._ensure_model(),
            frame,
            self.confidence_threshold,
        )

        detections = []

        for box in boxes:
            class_name = normalize_pedestrian_class(box.class_name)

            if class_name is None:
                continue

            detections.append(
                Detection(
                    class_name=class_name,
                    confidence=box.confidence,
                    bbox=box.bbox,
                )
            )

        return detections


class MockPedestrianDetector(Detector):
    """
    Walks a pedestrian from the kerb into the bus path and back, so the
    hazard logic can be exercised without weights.
    """

    def __init__(self, offsets: tuple[float, ...] = (0.05, 0.4, 0.5, 0.9)):
        self.offsets = cycle(offsets)

    def detect(self, frame) -> list[Detection]:
        height, width = frame.shape[:2]
        offset = next(self.offsets)

        left = width * offset

        return [
            Detection(
                class_name=PEDESTRIAN_CLASS,
                confidence=0.85,
                bbox=(
                    left,
                    height * 0.5,
                    left + width * 0.08,
                    height * 0.9,
                ),
            )
        ]


def build_pedestrian_detector(mode: str = DETECTOR_MODE) -> Detector:
    if mode == "yolo":
        return YoloPedestrianDetector()

    return MockPedestrianDetector()
