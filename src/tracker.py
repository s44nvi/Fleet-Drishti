"""
Minimal IOU tracker.

Incidents are not visible in a single frame - a vehicle has to be
followed across frames before it can be called rash or a hit-and-run.
This is deliberately simple (greedy IOU matching, no Kalman filter);
it is enough to hold an identity for a few seconds on an edge device.
"""
from dataclasses import dataclass, field

from config import TRACKER_IOU_THRESHOLD, TRACKER_MAX_AGE_SECONDS
from detectors.base import Detection


@dataclass
class Track:
    track_id: int
    class_name: str
    detection: Detection
    first_seen: float
    last_seen: float
    centers: list[tuple[float, float, float]] = field(
        default_factory=list
    )

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        return self.detection.bbox

    @property
    def age_seconds(self) -> float:
        return self.last_seen - self.first_seen


def center(bbox: tuple[float, float, float, float]):
    x1, y1, x2, y2 = bbox

    return (
        (x1 + x2) / 2,
        (y1 + y2) / 2,
    )


def iou(
    first: tuple[float, float, float, float],
    second: tuple[float, float, float, float],
) -> float:
    ax1, ay1, ax2, ay2 = first
    bx1, by1, bx2, by2 = second

    overlap_width = min(ax2, bx2) - max(ax1, bx1)
    overlap_height = min(ay2, by2) - max(ay1, by1)

    if overlap_width <= 0 or overlap_height <= 0:
        return 0.0

    overlap = overlap_width * overlap_height

    first_area = max(ax2 - ax1, 0) * max(ay2 - ay1, 0)
    second_area = max(bx2 - bx1, 0) * max(by2 - by1, 0)

    union = first_area + second_area - overlap

    if union <= 0:
        return 0.0

    return overlap / union


def travelled_per_second(track: Track) -> float:
    """Centre travel per second in pixels, over the track's history."""
    if len(track.centers) < 2:
        return 0.0

    first_time, first_x, first_y = track.centers[0]
    last_time, last_x, last_y = track.centers[-1]

    elapsed = last_time - first_time

    if elapsed <= 0:
        return 0.0

    distance = (
        (last_x - first_x) ** 2
        + (last_y - first_y) ** 2
    ) ** 0.5

    return distance / elapsed


def direction_changes(track: Track) -> int:
    """How often the track reversed horizontal direction (weaving)."""
    changes = 0
    previous_sign = 0

    for index in range(1, len(track.centers)):
        delta = track.centers[index][1] - track.centers[index - 1][1]

        if delta == 0:
            continue

        sign = 1 if delta > 0 else -1

        if previous_sign and sign != previous_sign:
            changes += 1

        previous_sign = sign

    return changes


class IouTracker:
    def __init__(
        self,
        iou_threshold: float = TRACKER_IOU_THRESHOLD,
        max_age_seconds: float = TRACKER_MAX_AGE_SECONDS,
        max_history: int = 30,
    ):
        self.iou_threshold = iou_threshold
        self.max_age_seconds = max_age_seconds
        self.max_history = max_history
        self.tracks: list[Track] = []
        self.next_track_id = 1

    def _match(self, detection: Detection) -> Track | None:
        best_track = None
        best_score = self.iou_threshold

        for track in self.tracks:
            if track.class_name != detection.class_name:
                continue

            score = iou(track.bbox, detection.bbox)

            if score >= best_score:
                best_track = track
                best_score = score

        return best_track

    def _record(self, track: Track, timestamp_seconds: float):
        center_x, center_y = center(track.bbox)

        track.centers.append(
            (timestamp_seconds, center_x, center_y)
        )

        if len(track.centers) > self.max_history:
            del track.centers[0]

    def _cleanup(self, timestamp_seconds: float):
        self.tracks = [
            track
            for track in self.tracks
            if timestamp_seconds - track.last_seen
            <= self.max_age_seconds
        ]

    def update(
        self,
        detections: list[Detection],
        timestamp_seconds: float,
    ) -> list[Track]:
        """Match detections to tracks and return the tracks seen now."""
        seen = []
        claimed: set[int] = set()

        for detection in detections:
            track = self._match(detection)

            if track is not None and track.track_id in claimed:
                track = None

            if track is None:
                track = Track(
                    track_id=self.next_track_id,
                    class_name=detection.class_name,
                    detection=detection,
                    first_seen=timestamp_seconds,
                    last_seen=timestamp_seconds,
                )

                self.next_track_id += 1
                self.tracks.append(track)
            else:
                track.detection = detection
                track.last_seen = timestamp_seconds

            claimed.add(track.track_id)

            self._record(track, timestamp_seconds)
            seen.append(track)

        self._cleanup(timestamp_seconds)

        return seen
