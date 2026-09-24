"""
Turns pedestrian detections into a "risky crossing" signal.

The camera looks forward from the bus, so a pedestrian matters when they
are inside the bus path - the middle of the frame, below the horizon -
rather than anywhere in view. How close they are is read from the height
of their box: a person filling half the frame is metres away.
"""
from dataclasses import dataclass

from config import (
    HAZARD_CLOSE_HEIGHT_RATIO,
    HAZARD_GROUP_SIZE,
    HAZARD_MIN_GAP_SECONDS,
    HAZARD_ZONE_LEFT,
    HAZARD_ZONE_RIGHT,
    HAZARD_ZONE_TOP,
)
from detectors.base import Detection
from detectors.pedestrian_detector import PEDESTRIAN_CLASS


# Subtypes sent with a "pedestrian_hazard" event, least to most urgent.
CROSSING_AHEAD = "crossing_ahead"
GROUP_CROSSING = "group_crossing"
CLOSE_PEDESTRIAN = "close_pedestrian"


@dataclass
class HazardSignal:
    subtype: str
    pedestrian_count: int
    confidence: float
    closest_height_ratio: float


def in_bus_path(
    detection: Detection,
    frame_width: float,
    frame_height: float,
    zone_left: float = HAZARD_ZONE_LEFT,
    zone_right: float = HAZARD_ZONE_RIGHT,
    zone_top: float = HAZARD_ZONE_TOP,
) -> bool:
    x1, y1, x2, y2 = detection.bbox

    center_x = (x1 + x2) / 2

    if center_x < frame_width * zone_left:
        return False

    if center_x > frame_width * zone_right:
        return False

    # Feet below the horizon line: on the road ahead, not on a skyline.
    return y2 >= frame_height * zone_top


def height_ratio(detection: Detection, frame_height: float) -> float:
    _, y1, _, y2 = detection.bbox

    if frame_height <= 0:
        return 0.0

    return (y2 - y1) / frame_height


class PedestrianHazardMonitor:
    """
    Emits at most one hazard event per HAZARD_MIN_GAP_SECONDS, unless the
    situation gets worse (a closer or larger group), which is reported
    straight away.
    """

    def __init__(
        self,
        close_height_ratio: float = HAZARD_CLOSE_HEIGHT_RATIO,
        group_size: int = HAZARD_GROUP_SIZE,
        min_gap_seconds: float = HAZARD_MIN_GAP_SECONDS,
    ):
        self.close_height_ratio = close_height_ratio
        self.group_size = group_size
        self.min_gap_seconds = min_gap_seconds
        self.last_subtype: str | None = None
        self.last_emitted_at: float | None = None

    def _severity(self, subtype: str) -> int:
        return (
            CROSSING_AHEAD,
            GROUP_CROSSING,
            CLOSE_PEDESTRIAN,
        ).index(subtype)

    def update(
        self,
        detections: list[Detection],
        timestamp_seconds: float,
        frame_shape,
    ) -> HazardSignal | None:
        frame_height, frame_width = frame_shape[:2]

        at_risk = [
            detection
            for detection in detections
            if detection.class_name == PEDESTRIAN_CLASS
            and in_bus_path(detection, frame_width, frame_height)
        ]

        if not at_risk:
            return None

        closest = max(
            height_ratio(detection, frame_height)
            for detection in at_risk
        )

        if closest >= self.close_height_ratio:
            subtype = CLOSE_PEDESTRIAN
        elif len(at_risk) >= self.group_size:
            subtype = GROUP_CROSSING
        else:
            subtype = CROSSING_AHEAD

        escalated = (
            self.last_subtype is None
            or self._severity(subtype) > self._severity(self.last_subtype)
        )

        gap_elapsed = (
            self.last_emitted_at is None
            or timestamp_seconds - self.last_emitted_at
            >= self.min_gap_seconds
        )

        if not escalated and not gap_elapsed:
            return None

        self.last_subtype = subtype
        self.last_emitted_at = timestamp_seconds

        return HazardSignal(
            subtype=subtype,
            pedestrian_count=len(at_risk),
            confidence=max(
                detection.confidence for detection in at_risk
            ),
            closest_height_ratio=closest,
        )
