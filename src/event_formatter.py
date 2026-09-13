from datetime import datetime, timezone

from config import BUS_ID, ROUTE_ID, CAMERA_ID
from detectors.base import Detection
from gps_provider import GPSPoint


def detection_to_event(
    detection: Detection,
    gps: GPSPoint,
    timestamp: datetime | None = None,
) -> dict:
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    return {
        "type": "road_defect",
        "subtype": detection.class_name,
        "confidence": detection.confidence,
        "timestamp": timestamp.isoformat(),
        "gps": {
            "lat": gps.lat,
            "lng": gps.lng,
        },
        "bus_id": BUS_ID,
        "route_id": ROUTE_ID,
        "camera_id": CAMERA_ID,
    }