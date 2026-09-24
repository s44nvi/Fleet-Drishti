"""
Vehicle detection and classification.

COCO-pretrained YOLO already covers every vehicle class we report, so
"yolo" mode here works with public weights (VEHICLE_MODEL_PATH, default
yolov8n.pt) - no fine-tuning needed. "mock" mode keeps the pipeline
runnable without weights.
"""
from itertools import cycle

from config import (
    DETECTOR_MODE,
    VEHICLE_CONFIDENCE,
    VEHICLE_MODEL_PATH,
)
from detectors.base import Detection, Detector
from detectors.yolo_backend import load_model, run_model


VEHICLE_CLASSES = (
    "car",
    "bus",
    "truck",
    "two_wheeler",
)

VEHICLE_ALIASES = {
    "car": "car",
    "bus": "bus",
    "truck": "truck",
    "two wheeler": "two_wheeler",
    "motorcycle": "two_wheeler",
    "motorbike": "two_wheeler",
    "bicycle": "two_wheeler",
}


def normalize_vehicle_class(label: str) -> str | None:
    """Map a model label onto one of VEHICLE_CLASSES, or None."""
    key = label.strip().lower().replace("_", " ").replace("-", " ")
    key = " ".join(key.split())

    return VEHICLE_ALIASES.get(key)


def count_by_class(detections: list[Detection]) -> dict[str, int]:
    counts = {class_name: 0 for class_name in VEHICLE_CLASSES}

    for detection in detections:
        if detection.class_name in counts:
            counts[detection.class_name] += 1

    return counts


class YoloVehicleDetector(Detector):
    def __init__(
        self,
        weights_path: str = VEHICLE_MODEL_PATH,
        confidence_threshold: float = VEHICLE_CONFIDENCE,
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
            class_name = normalize_vehicle_class(box.class_name)

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


class MockVehicleDetector(Detector):
    """
    Emits a repeating pattern of vehicle counts so the rolling density
    signal can be exercised without weights.
    """

    def __init__(self, counts: tuple[int, ...] = (2, 5, 9, 13, 13, 4)):
        self.counts = cycle(counts)

    def detect(self, frame) -> list[Detection]:
        height, width = frame.shape[:2]
        count = next(self.counts)

        detections = []

        for index in range(count):
            left = width * (index % 5) / 5.0
            top = height * ((index // 5) % 3) / 3.0

            detections.append(
                Detection(
                    class_name=VEHICLE_CLASSES[index % len(VEHICLE_CLASSES)],
                    confidence=0.80,
                    bbox=(
                        left,
                        top,
                        left + width / 6.0,
                        top + height / 4.0,
                    ),
                )
            )

        return detections


def build_vehicle_detector(mode: str = DETECTOR_MODE) -> Detector:
    if mode == "yolo":
        return YoloVehicleDetector()

    return MockVehicleDetector()
