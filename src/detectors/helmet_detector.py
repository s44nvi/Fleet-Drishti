"""
Helmet detection (opt-in, HELMET_DETECTION_ENABLED).

The helmet model reports "With Helmet" / "Without Helmet". Only
"Without Helmet" becomes an event (safety_violation / no_helmet);
"With Helmet" is kept so the annotated video can show both.
"""
from config import HELMET_CONFIDENCE, HELMET_MODEL_PATH
from detectors.base import Detection, Detector
from detectors.yolo_backend import load_model, run_model


WITH_HELMET = "with_helmet"
NO_HELMET = "no_helmet"

HELMET_ALIASES = {
    "with helmet": WITH_HELMET,
    "helmet": WITH_HELMET,
    "without helmet": NO_HELMET,
    "no helmet": NO_HELMET,
}


def normalize_helmet_class(label: str) -> str | None:
    key = label.strip().lower().replace("_", " ").replace("-", " ")
    key = " ".join(key.split())

    return HELMET_ALIASES.get(key)


class YoloHelmetDetector(Detector):
    def __init__(
        self,
        weights_path: str = HELMET_MODEL_PATH,
        confidence_threshold: float = HELMET_CONFIDENCE,
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
            class_name = normalize_helmet_class(box.class_name)

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


def build_helmet_detector() -> Detector:
    return YoloHelmetDetector()
