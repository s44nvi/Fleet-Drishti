"""
Rolling traffic-density / bottleneck signal.

Vehicle counts on a single frame are noisy (occlusion, a truck hiding
three cars), so congestion is decided on a rolling average over a time
window instead of frame by frame.
"""
from dataclasses import dataclass

from config import (
    DENSITY_HEAVY_COUNT,
    DENSITY_MIN_GAP_SECONDS,
    DENSITY_MODERATE_COUNT,
    DENSITY_WINDOW_SECONDS,
)
from detectors.base import Detection
from detectors.vehicle_detector import VEHICLE_CLASSES, count_by_class


LIGHT = "light"
MODERATE = "moderate"
HEAVY = "heavy"


@dataclass
class DensitySample:
    vehicle_count: int
    mean_confidence: float
    timestamp_seconds: float


@dataclass
class DensitySignal:
    level: str
    average_count: float
    vehicle_count: int
    counts_by_class: dict[str, int]
    confidence: float


def mean_confidence(detections: list[Detection]) -> float:
    if not detections:
        return 0.0

    total = sum(detection.confidence for detection in detections)

    return total / len(detections)


def congestion_level(
    average_count: float,
    moderate_count: float = DENSITY_MODERATE_COUNT,
    heavy_count: float = DENSITY_HEAVY_COUNT,
) -> str:
    if average_count >= heavy_count:
        return HEAVY

    if average_count >= moderate_count:
        return MODERATE

    return LIGHT


class DensityMonitor:
    """
    Turns per-frame vehicle detections into congestion events.

    An event is emitted when the rolling level is moderate or heavy, and
    then only when the level changes or the minimum gap has passed - a
    bus stuck in one jam should report it once, not once per frame.
    """

    def __init__(
        self,
        window_seconds: float = DENSITY_WINDOW_SECONDS,
        moderate_count: float = DENSITY_MODERATE_COUNT,
        heavy_count: float = DENSITY_HEAVY_COUNT,
        min_gap_seconds: float = DENSITY_MIN_GAP_SECONDS,
    ):
        self.window_seconds = window_seconds
        self.moderate_count = moderate_count
        self.heavy_count = heavy_count
        self.min_gap_seconds = min_gap_seconds
        self.samples: list[DensitySample] = []
        self.last_level = LIGHT
        self.last_emitted_at: float | None = None

    def _average_count(self) -> float:
        if not self.samples:
            return 0.0

        total = sum(sample.vehicle_count for sample in self.samples)

        return total / len(self.samples)

    def _average_confidence(self) -> float:
        counted = [
            sample
            for sample in self.samples
            if sample.vehicle_count > 0
        ]

        if not counted:
            return 0.0

        total = sum(sample.mean_confidence for sample in counted)

        return total / len(counted)

    def _cleanup(self, current_time: float):
        self.samples = [
            sample
            for sample in self.samples
            if current_time - sample.timestamp_seconds
            <= self.window_seconds
        ]

    def update(
        self,
        detections: list[Detection],
        timestamp_seconds: float,
    ) -> DensitySignal | None:
        vehicles = [
            detection
            for detection in detections
            if detection.class_name in VEHICLE_CLASSES
        ]

        self.samples.append(
            DensitySample(
                vehicle_count=len(vehicles),
                mean_confidence=mean_confidence(vehicles),
                timestamp_seconds=timestamp_seconds,
            )
        )

        self._cleanup(timestamp_seconds)

        average_count = self._average_count()

        level = congestion_level(
            average_count,
            self.moderate_count,
            self.heavy_count,
        )

        previous_level = self.last_level
        self.last_level = level

        if level == LIGHT:
            return None

        level_changed = level != previous_level

        gap_elapsed = (
            self.last_emitted_at is None
            or timestamp_seconds - self.last_emitted_at
            >= self.min_gap_seconds
        )

        if not level_changed and not gap_elapsed:
            return None

        self.last_emitted_at = timestamp_seconds

        return DensitySignal(
            level=level,
            average_count=average_count,
            vehicle_count=len(vehicles),
            counts_by_class=count_by_class(vehicles),
            confidence=self._average_confidence(),
        )
