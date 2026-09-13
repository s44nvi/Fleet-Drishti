from datetime import datetime, timezone, timedelta

from video_reader import read_video
from detectors.mock_detector import MockDetector
from gps_provider import SimulatedGPS
from event_formatter import detection_to_event
from backend_client import send_event, send_evidence
from dedup import Deduplicator
from evidence import save_detection_frame

VIDEO_PATH = "sample.mp4"


def main():
    detector = MockDetector()
    gps_provider = SimulatedGPS()
    deduplicator = Deduplicator(
        max_distance=100.0,
        max_gap_seconds=1.0,
    )

    events_sent = 0
    evidence_sent = 0
    detections_seen = 0

    print(f"Processing video: {VIDEO_PATH}")

    video_start_time = datetime.now(timezone.utc)

    for item in read_video(VIDEO_PATH):
        frame_number = item["frame_number"]
        timestamp_seconds = item["timestamp_seconds"]
        frame = item["frame"]

        detections = detector.detect(frame)
        detections_seen += len(detections)

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

            # Save evidence frame locally
            evidence_path = save_detection_frame(
                frame,
                frame_number,
            )

            # GPS
            gps = gps_provider.get_location(
                timestamp_seconds
            )

            # Event timestamp
            event_timestamp = (
                video_start_time
                + timedelta(seconds=timestamp_seconds)
            )

            # Create event payload
            event = detection_to_event(
                detection=detection,
                gps=gps,
                timestamp=event_timestamp,
            )

            # Send event to backend
            response = send_event(event)
            events_sent += 1

            event_id = response["id"]

            # Send evidence to backend
            evidence_response = send_evidence(
                event_id=event_id,
                frame_path=evidence_path,
                timestamp=event["timestamp"],
                gps=event["gps"],
                bus_id=event["bus_id"],
                route_id=event["route_id"],
                confidence=event["confidence"],
            )

            evidence_sent += 1

            print(
                f"Frame {frame_number} | "
                f"Sent: {detection.class_name} "
                f"(confidence={detection.confidence:.2f}) "
                f"event_id={event_id} "
                f"evidence_id={evidence_response['id']} "
                f"evidence={evidence_path}"
            )

    print("\nFinished.")
    print(f"Detections seen: {detections_seen}")
    print(f"Events sent: {events_sent}")
    print(f"Evidence sent: {evidence_sent}")


if __name__ == "__main__":
    main()