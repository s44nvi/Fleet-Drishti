from dataclasses import dataclass
from typing import Optional

from detectors.base import Detection


@dataclass
class TrackedDetection:
    detection: Detection
    first_seen: float
    last_seen: float


class Deduplicator:
    """
    Prevents the same detection from generating an event on every frame.

    A detection is considered the same object when:
    - it has the same class
    - its bounding-box center is close to the previous detection
    - it appears within the configured time window
    """

    def __init__(
        self,
        max_distance: float = 100.0,
        max_gap_seconds: float = 1.0,
    ):
        self.max_distance = max_distance
        self.max_gap_seconds = max_gap_seconds
        self.active: list[TrackedDetection] = []

    @staticmethod
    def _center(detection: Detection):
        x1, y1, x2, y2 = detection.bbox
        return (
            (x1 + x2) / 2,
            (y1 + y2) / 2,
        )

    def _is_same_detection(
        self,
        existing: TrackedDetection,
        detection: Detection,
        timestamp_seconds: float,
    ) -> bool:
        if existing.detection.class_name != detection.class_name:
            return False

        if timestamp_seconds - existing.last_seen > self.max_gap_seconds:
            return False

        old_x, old_y = self._center(existing.detection)
        new_x, new_y = self._center(detection)

        distance = ((new_x - old_x) ** 2 + (new_y - old_y) ** 2) ** 0.5

        return distance <= self.max_distance

    def should_emit(
        self,
        detection: Detection,
        timestamp_seconds: float,
    ) -> bool:
        """
        Returns True only when this detection should create a new event.
        """

        for tracked in self.active:
            if self._is_same_detection(
                tracked,
                detection,
                timestamp_seconds,
            ):
                tracked.detection = detection
                tracked.last_seen = timestamp_seconds
                return False

        self.active.append(
            TrackedDetection(
                detection=detection,
                first_seen=timestamp_seconds,
                last_seen=timestamp_seconds,
            )
        )

        self._cleanup(timestamp_seconds)

        return True

    def _cleanup(self, current_time: float):
        self.active = [
            tracked
            for tracked in self.active
            if current_time - tracked.last_seen <= self.max_gap_seconds
        ]