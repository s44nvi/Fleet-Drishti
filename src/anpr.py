"""
ANPR - reading the number plate of a tracked vehicle.

The plate is read from a crop of the vehicle box rather than the whole
frame: it is faster, and it keeps the reading tied to the vehicle the
incident was raised against. The OCR confidence is kept separate from
the detection confidence - a certain vehicle can still have an unreadable
plate.

easyocr is imported lazily so mock mode runs with nothing installed.
"""
import re
from dataclasses import dataclass

from config import (
    ANPR_LANGUAGES,
    ANPR_MIN_CONFIDENCE,
    ANPR_MODE,
    ANPR_USE_GPU,
)


# Indian registration plates: MH12AB1234, DL8CAF5031, ...
PLATE_PATTERN = re.compile(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$")

_OCR_READER = None


@dataclass
class PlateReading:
    text: str
    confidence: float


def normalize_plate_text(text: str) -> str:
    return "".join(
        character
        for character in text.upper()
        if character.isalnum()
    )


def looks_like_plate(text: str) -> bool:
    return bool(PLATE_PATTERN.match(normalize_plate_text(text)))


def crop_plate_region(frame, bbox: tuple[float, float, float, float]):
    """
    Crop the lower part of the vehicle box, where the plate sits.

    Returns None when the box falls outside the frame or is too small to
    be worth reading.
    """
    height, width = frame.shape[:2]

    x1, y1, x2, y2 = bbox

    box_height = y2 - y1

    left = max(int(x1), 0)
    right = min(int(x2), width)
    top = max(int(y2 - box_height * 0.45), 0)
    bottom = min(int(y2), height)

    if right - left < 8 or bottom - top < 8:
        return None

    return frame[top:bottom, left:right]


def _load_reader():
    global _OCR_READER

    if _OCR_READER is None:
        import easyocr

        _OCR_READER = easyocr.Reader(
            ANPR_LANGUAGES,
            gpu=ANPR_USE_GPU,
        )

    return _OCR_READER


class EasyOcrPlateReader:
    def __init__(
        self,
        min_confidence: float = ANPR_MIN_CONFIDENCE,
        reader=None,
    ):
        self.min_confidence = min_confidence
        self.reader = reader

    def _ensure_reader(self):
        if self.reader is None:
            self.reader = _load_reader()

        return self.reader

    def read(self, frame, bbox) -> PlateReading | None:
        crop = crop_plate_region(frame, bbox)

        if crop is None:
            return None

        results = self._ensure_reader().readtext(crop)

        best = None

        for result in results:
            # easyocr returns (box, text, confidence)
            text = normalize_plate_text(result[1])
            confidence = float(result[2])

            if confidence < self.min_confidence:
                continue

            if not looks_like_plate(text):
                continue

            if best is None or confidence > best.confidence:
                best = PlateReading(
                    text=text,
                    confidence=confidence,
                )

        return best


class MockPlateReader:
    """Deterministic plate per track, for local dev and CI."""

    def __init__(self, confidence: float = 0.72):
        self.confidence = confidence
        self.reads = 0

    def read(self, frame, bbox) -> PlateReading | None:
        self.reads += 1

        return PlateReading(
            text=f"MH12AB{1000 + self.reads:04d}",
            confidence=self.confidence,
        )


def build_plate_reader(mode: str = ANPR_MODE):
    if mode == "easyocr":
        return EasyOcrPlateReader()

    return MockPlateReader()
