"""
Incident detection - rash driving and suspected hit-and-run.

Both need a vehicle followed over time (tracker.py), not a single frame:
speed and weaving only exist across frames, and a collision is a vehicle
track overlapping a pedestrian while moving fast.

Once a track is flagged, ANPR runs on that track's box to read the
registration number. The plate confidence stays separate from the
detection confidence - the vehicle can be certain while the plate is a
guess.

TODO: these are heuristics, not a trained incident model. Speed is
measured in image space, so a vehicle close to the camera looks faster
than the same vehicle far away; a fine-tuned model (or homography to
ground plane) should replace this before the numbers are trusted for
enforcement.
"""
from dataclasses import dataclass

from config import (
    COLLISION_IOU,
    INCIDENT_MIN_GAP_SECONDS,
    RASH_DIRECTION_CHANGES,
    RASH_SPEED_RATIO,
)
from detectors.base import Detection
from detectors.pedestrian_detector import PEDESTRIAN_CLASS
from tracker import (
    IouTracker,
    Track,
    direction_changes,
    iou,
    travelled_per_second,
)


RASH_DRIVING = "rash_driving"
HIT_AND_RUN = "hit_and_run"


@dataclass
class IncidentSignal:
    subtype: str
    track_id: int
    detection_confidence: float
    plate_number: str | None
    plate_confidence: float | None
    speed_ratio: float
    bbox: tuple[float, float, float, float]


def frame_diagonal(frame_shape) -> float:
    height, width = frame_shape[:2]

    return (width ** 2 + height ** 2) ** 0.5


def speed_ratio(track: Track, frame_shape) -> float:
    """Track speed as a fraction of the frame diagonal per second."""
    diagonal = frame_diagonal(frame_shape)

    if diagonal <= 0:
        return 0.0

    return travelled_per_second(track) / diagonal


def hits_pedestrian(
    track: Track,
    pedestrians: list[Detection],
    collision_iou: float = COLLISION_IOU,
) -> bool:
    return any(
        iou(track.bbox, pedestrian.bbox) >= collision_iou
        for pedestrian in pedestrians
    )


class IncidentMonitor:
    def __init__(
        self,
        plate_reader,
        tracker: IouTracker | None = None,
        rash_speed_ratio: float = RASH_SPEED_RATIO,
        rash_direction_changes: int = RASH_DIRECTION_CHANGES,
        collision_iou: float = COLLISION_IOU,
        min_gap_seconds: float = INCIDENT_MIN_GAP_SECONDS,
    ):
        self.plate_reader = plate_reader
        self.tracker = tracker or IouTracker()
        self.rash_speed_ratio = rash_speed_ratio
        self.rash_direction_changes = rash_direction_changes
        self.collision_iou = collision_iou
        self.min_gap_seconds = min_gap_seconds
        self.last_emitted_at: dict[int, float] = {}

    def _classify(
        self,
        track: Track,
        pedestrians: list[Detection],
        frame_shape,
    ) -> tuple[str, float] | None:
        current_speed = speed_ratio(track, frame_shape)

        if hits_pedestrian(track, pedestrians, self.collision_iou):
            return HIT_AND_RUN, current_speed

        if current_speed >= self.rash_speed_ratio:
            return RASH_DRIVING, current_speed

        if direction_changes(track) >= self.rash_direction_changes:
            return RASH_DRIVING, current_speed

        return None

    def _recently_reported(
        self,
        track: Track,
        timestamp_seconds: float,
    ) -> bool:
        last = self.last_emitted_at.get(track.track_id)

        if last is None:
            return False

        return timestamp_seconds - last < self.min_gap_seconds

    def update(
        self,
        vehicles: list[Detection],
        pedestrians: list[Detection],
        frame,
        timestamp_seconds: float,
    ) -> list[IncidentSignal]:
        """
        Track this frame's vehicles and report any that look like an
        incident. ANPR only runs on flagged tracks - it is far too slow
        to run on every vehicle in every frame.
        """
        tracks = self.tracker.update(vehicles, timestamp_seconds)

        people = [
            detection
            for detection in pedestrians
            if detection.class_name == PEDESTRIAN_CLASS
        ]

        signals = []

        for track in tracks:
            flagged = self._classify(track, people, frame.shape)

            if flagged is None:
                continue

            if self._recently_reported(track, timestamp_seconds):
                continue

            subtype, current_speed = flagged

            self.last_emitted_at[track.track_id] = timestamp_seconds

            plate = self.plate_reader.read(frame, track.bbox)

            signals.append(
                IncidentSignal(
                    subtype=subtype,
                    track_id=track.track_id,
                    detection_confidence=track.detection.confidence,
                    plate_number=plate.text if plate else None,
                    plate_confidence=(
                        plate.confidence if plate else None
                    ),
                    speed_ratio=current_speed,
                    bbox=track.bbox,
                )
            )

        return signals
