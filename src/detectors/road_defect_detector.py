"""
Road-defect detection.

Two modes, selected by config.DETECTOR_MODE:

- "mock"  -> MockDetector, needs no weights (local dev / CI)
- "yolo"  -> YoloRoadDefectDetector, loads weights from
             ROAD_DEFECT_MODEL_PATH

TODO: train / obtain the fine-tuned road-defect weights.
No public YOLO checkpoint covers all six defect classes we report
(pothole, damaged road, missing divider, missing zebra crossing,
damaged signboard, waterlogging). Until those weights exist, "yolo"
mode only reports what the loaded model actually predicts and "mock"
stays the default so the pipeline keeps running.
"""
from config import (
    DETECTOR_MODE,
    ROAD_DEFECT_CONFIDENCE,
    ROAD_DEFECT_MODEL_PATH,
)
from detectors.base import Detection, Detector
from detectors.mock_detector import MockDetector
from detectors.yolo_backend import load_model, run_model


# Subtypes the backend receives for a "road_defect" event.
DEFECT_CLASSES = (
    "pothole",
    "damaged_road",
    "missing_divider",
    "missing_zebra_crossing",
    "damaged_signboard",
    "waterlogging",
)

# Labels differ between road-damage datasets (RDD2022 uses D00/D10/D20/D40),
# so model labels are mapped onto our own subtypes rather than passed through.
DEFECT_ALIASES = {
    "pothole": "pothole",
    "potholes": "pothole",
    "d40": "pothole",
    "damaged road": "damaged_road",
    "road damage": "damaged_road",
    "crack": "damaged_road",
    "longitudinal crack": "damaged_road",
    "transverse crack": "damaged_road",
    "alligator crack": "damaged_road",
    "rutting": "damaged_road",
    "ravelling": "damaged_road",
    "d00": "damaged_road",
    "d10": "damaged_road",
    "d20": "damaged_road",
    "missing divider": "missing_divider",
    "broken divider": "missing_divider",
    "divider missing": "missing_divider",
    "missing zebra crossing": "missing_zebra_crossing",
    "faded zebra crossing": "missing_zebra_crossing",
    "faded crosswalk": "missing_zebra_crossing",
    "damaged signboard": "damaged_signboard",
    "missing signboard": "damaged_signboard",
    "damaged sign": "damaged_signboard",
    "broken sign": "damaged_signboard",
    "waterlogging": "waterlogging",
    "water logging": "waterlogging",
    "standing water": "waterlogging",
    "puddle": "waterlogging",
    "flood": "waterlogging",
}


def normalize_defect_class(label: str) -> str | None:
    """
    Map a model label onto one of DEFECT_CLASSES.

    Returns None for labels we do not report as road defects, so a
    general-purpose model can be used without leaking its other classes
    (person, car, ...) into road_defect events.
    """
    key = label.strip().lower().replace("_", " ").replace("-", " ")
    key = " ".join(key.split())

    return DEFECT_ALIASES.get(key)


class YoloRoadDefectDetector(Detector):
    def __init__(
        self,
        weights_path: str = ROAD_DEFECT_MODEL_PATH,
        confidence_threshold: float = ROAD_DEFECT_CONFIDENCE,
        model=None,
    ):
        self.weights_path = weights_path
        self.confidence_threshold = confidence_threshold
        self.model = model

    def _ensure_model(self):
        # Loaded on first use: constructing the detector must not require
        # weights to be present.
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
            class_name = normalize_defect_class(box.class_name)

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


def build_road_defect_detector(mode: str = DETECTOR_MODE) -> Detector:
    if mode == "yolo":
        return YoloRoadDefectDetector()

    return MockDetector()
