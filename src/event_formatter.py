from datetime import datetime, timezone

from config import BUS_ID, ROUTE_ID, CAMERA_ID
from density import DensitySignal
from detectors.base import Detection
from gps_provider import GPSPoint
from pedestrian_safety import HazardSignal


# Event types the backend accepts on POST /events.
ROAD_DEFECT = "road_defect"
TRAFFIC_DENSITY = "traffic_density"
PEDESTRIAN_HAZARD = "pedestrian_hazard"


def build_event(
    event_type: str,
    subtype: str,
    confidence: float,
    gps: GPSPoint,
    timestamp: datetime | None = None,
) -> dict:
    """
    Build the payload POST /events expects.

    Every event type goes through here so the payload shape stays in one
    place - the backend contract is shared with a separate service.
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    return {
        "type": event_type,
        "subtype": subtype,
        "confidence": confidence,
        "timestamp": timestamp.isoformat(),
        "gps": {
            "lat": gps.lat,
            "lng": gps.lng,
        },
        "bus_id": BUS_ID,
        "route_id": ROUTE_ID,
        "camera_id": CAMERA_ID,
    }


def detection_to_event(
    detection: Detection,
    gps: GPSPoint,
    timestamp: datetime | None = None,
) -> dict:
    return build_event(
        event_type=ROAD_DEFECT,
        subtype=detection.class_name,
        confidence=detection.confidence,
        gps=gps,
        timestamp=timestamp,
    )


def density_to_event(
    signal: DensitySignal,
    gps: GPSPoint,
    timestamp: datetime | None = None,
) -> dict:
    """
    Congestion level is sent as the subtype ("moderate" / "heavy"), which
    keeps traffic_density inside the existing payload shape.
    """
    return build_event(
        event_type=TRAFFIC_DENSITY,
        subtype=signal.level,
        confidence=signal.confidence,
        gps=gps,
        timestamp=timestamp,
    )


def hazard_to_event(
    signal: HazardSignal,
    gps: GPSPoint,
    timestamp: datetime | None = None,
) -> dict:
    """
    The kind of hazard is sent as the subtype ("crossing_ahead",
    "group_crossing", "close_pedestrian").
    """
    return build_event(
        event_type=PEDESTRIAN_HAZARD,
        subtype=signal.subtype,
        confidence=signal.confidence,
        gps=gps,
        timestamp=timestamp,
    )
