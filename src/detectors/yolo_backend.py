"""
Thin wrapper around ultralytics YOLO.

Kept separate from the individual detectors so that every YOLO-based
detector parses model output the same way, and so that ultralytics is
imported lazily - mock mode must work on a machine with no weights,
no GPU and no ultralytics installed.
"""
from dataclasses import dataclass


_MODEL_CACHE: dict[str, object] = {}


@dataclass
class RawBox:
    class_name: str
    confidence: float
    bbox: tuple[float, float, float, float]


def load_model(weights_path: str):
    """
    Load a YOLO model, reusing an already loaded one for the same weights.

    Several detectors share the same COCO weights, and loading them once
    matters on an edge device.
    """
    model = _MODEL_CACHE.get(weights_path)

    if model is None:
        from ultralytics import YOLO

        model = YOLO(weights_path)
        _MODEL_CACHE[weights_path] = model

    return model


def _flatten(value) -> list:
    if hasattr(value, "tolist"):
        value = value.tolist()

    if isinstance(value, (list, tuple)):
        flat = []

        for item in value:
            flat.extend(_flatten(item))

        return flat

    return [value]


def _class_name(names, class_id: int) -> str:
    if isinstance(names, dict):
        return str(names.get(class_id, class_id))

    if names is not None and 0 <= class_id < len(names):
        return str(names[class_id])

    return str(class_id)


def run_model(
    model,
    frame,
    confidence_threshold: float = 0.25,
) -> list[RawBox]:
    """Run the model on one frame and return its boxes in a plain form."""
    results = model.predict(
        frame,
        conf=confidence_threshold,
        verbose=False,
    )

    boxes = []

    for result in results:
        names = getattr(result, "names", None)

        if not names:
            names = getattr(model, "names", None)

        for box in getattr(result, "boxes", None) or []:
            confidence = _flatten(box.conf)[0]

            if confidence < confidence_threshold:
                continue

            class_id = int(_flatten(box.cls)[0])
            x1, y1, x2, y2 = _flatten(box.xyxy)[:4]

            boxes.append(
                RawBox(
                    class_name=_class_name(names, class_id),
                    confidence=float(confidence),
                    bbox=(
                        float(x1),
                        float(y1),
                        float(x2),
                        float(y2),
                    ),
                )
            )

    return boxes
