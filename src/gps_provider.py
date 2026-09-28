import json
from dataclasses import dataclass

from config import GPS_TRACK_FILE


@dataclass
class GPSPoint:
    lat: float
    lng: float


class SimulatedGPS:
    def __init__(self, lat: float = 19.0760, lng: float = 72.8777):
        self.point = GPSPoint(lat=lat, lng=lng)

    def get_location(self, timestamp_seconds: float) -> GPSPoint:
        return self.point


class TrackGPS:
    """
    Follows a pre-computed track of {"t": seconds, "lat": .., "lng": ..}
    points, interpolating linearly between them and holding the first /
    last point outside the track. Still simulated: the track is not read
    from a GPS receiver.
    """

    def __init__(self, points: list[dict]):
        if not points:
            raise ValueError("GPS track has no points")

        self.points = sorted(points, key=lambda point: point["t"])

    @classmethod
    def from_file(cls, path: str) -> "TrackGPS":
        with open(path) as track_file:
            return cls(json.load(track_file))

    def get_location(self, timestamp_seconds: float) -> GPSPoint:
        first = self.points[0]
        last = self.points[-1]

        if timestamp_seconds <= first["t"]:
            return GPSPoint(lat=first["lat"], lng=first["lng"])

        if timestamp_seconds >= last["t"]:
            return GPSPoint(lat=last["lat"], lng=last["lng"])

        for before, after in zip(self.points, self.points[1:]):
            if before["t"] <= timestamp_seconds <= after["t"]:
                span = after["t"] - before["t"]
                ratio = (
                    (timestamp_seconds - before["t"]) / span
                    if span > 0
                    else 0.0
                )

                return GPSPoint(
                    lat=before["lat"] + ratio * (after["lat"] - before["lat"]),
                    lng=before["lng"] + ratio * (after["lng"] - before["lng"]),
                )

        return GPSPoint(lat=last["lat"], lng=last["lng"])


def build_gps_provider(track_file: str = GPS_TRACK_FILE):
    if track_file:
        return TrackGPS.from_file(track_file)

    return SimulatedGPS()
