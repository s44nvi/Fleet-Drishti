from dataclasses import dataclass
from datetime import datetime, timezone, timedelta

from video_reader import read_video
from density import DensityMonitor
from detectors.pedestrian_detector import build_pedestrian_detector
from detectors.road_defect_detector import build_road_defect_detector
from detectors.vehicle_detector import build_vehicle_detector
from gps_provider import SimulatedGPS
from event_formatter import (
    density_to_event,
    detection_to_event,
    hazard_to_event,
)
from backend_client import send_event, send_evidence
from dedup import Deduplicator
from pedestrian_safety import PedestrianHazardMonitor
from evidence import save_detection_frame


VIDEO_PATH = "sample.mp4"


@dataclass
class PipelineStats:
    detections_seen: int = 0
    events_sent: int = 0
    events_queued: int = 0
    evidence_sent: int = 0


def emit_event(
    event: dict,
    frame,
    frame_number: int,
    label: str,
    stats: PipelineStats,
):
    """
    Save the evidence still, send the event, then send the evidence.

    Only event JSON and the still ever leave the bus - raw video never
    does.
    """
    evidence_path = save_detection_frame(frame, frame_number)

    response = send_event(event)

    # Backend unavailable -> event is queued locally
    if response.get("queued"):
        stats.events_queued += 1

        print(
            f"Frame {frame_number} | "
            f"Queued: {label} "
            f"(confidence={event['confidence']:.2f}) "
            f"evidence={evidence_path}"
        )

        return

    # Backend accepted event
    stats.events_sent += 1

    event_id = response["id"]

    # Send evidence only after event exists
    evidence_response = send_evidence(
        event_id=event_id,
        frame_path=evidence_path,
        timestamp=event["timestamp"],
        gps=event["gps"],
        bus_id=event["bus_id"],
        route_id=event["route_id"],
        confidence=event["confidence"],
    )

    stats.evidence_sent += 1

    print(
        f"Frame {frame_number} | "
        f"Sent: {label} "
        f"(confidence={event['confidence']:.2f}) "
        f"event_id={event_id} "
        f"evidence_id={evidence_response['id']} "
        f"evidence={evidence_path}"
    )


def main():
    road_defect_detector = build_road_defect_detector()
    vehicle_detector = build_vehicle_detector()
    pedestrian_detector = build_pedestrian_detector()

    gps_provider = SimulatedGPS()

    deduplicator = Deduplicator(
        max_distance=100.0,
        max_gap_seconds=1.0,
    )

    density_monitor = DensityMonitor()
    hazard_monitor = PedestrianHazardMonitor()

    stats = PipelineStats()

    print(f"Processing video: {VIDEO_PATH}")

    video_start_time = datetime.now(timezone.utc)

    for item in read_video(VIDEO_PATH):
        frame_number = item["frame_number"]
        timestamp_seconds = item["timestamp_seconds"]
        frame = item["frame"]

        gps = gps_provider.get_location(timestamp_seconds)

        event_timestamp = (
            video_start_time
            + timedelta(seconds=timestamp_seconds)
        )

        # Road defects
        detections = road_defect_detector.detect(frame)
        stats.detections_seen += len(detections)

        for detection in detections:

            if not deduplicator.should_emit(
                detection,
                timestamp_seconds,
            ):
                print(
                    f"Frame {frame_number} | "
                    f"{detection.class_name} | duplicate skipped"
                )
                continue

            emit_event(
                event=detection_to_event(
                    detection=detection,
                    gps=gps,
                    timestamp=event_timestamp,
                ),
                frame=frame,
                frame_number=frame_number,
                label=detection.class_name,
                stats=stats,
            )

        # Traffic density
        vehicles = vehicle_detector.detect(frame)
        stats.detections_seen += len(vehicles)

        density_signal = density_monitor.update(
            vehicles,
            timestamp_seconds,
        )

        if density_signal is not None:
            emit_event(
                event=density_to_event(
                    signal=density_signal,
                    gps=gps,
                    timestamp=event_timestamp,
                ),
                frame=frame,
                frame_number=frame_number,
                label=(
                    f"traffic_density/{density_signal.level} "
                    f"(vehicles={density_signal.vehicle_count}, "
                    f"avg={density_signal.average_count:.1f})"
                ),
                stats=stats,
            )

        # Pedestrian safety
        pedestrians = pedestrian_detector.detect(frame)
        stats.detections_seen += len(pedestrians)

        hazard_signal = hazard_monitor.update(
            pedestrians,
            timestamp_seconds,
            frame.shape,
        )

        if hazard_signal is not None:
            emit_event(
                event=hazard_to_event(
                    signal=hazard_signal,
                    gps=gps,
                    timestamp=event_timestamp,
                ),
                frame=frame,
                frame_number=frame_number,
                label=(
                    f"pedestrian_hazard/{hazard_signal.subtype} "
                    f"(pedestrians={hazard_signal.pedestrian_count})"
                ),
                stats=stats,
            )

    print("\nFinished.")
    print(f"Detections seen: {stats.detections_seen}")
    print(f"Events sent: {stats.events_sent}")
    print(f"Events queued: {stats.events_queued}")
    print(f"Evidence sent: {stats.evidence_sent}")


if __name__ == "__main__":
    main()
