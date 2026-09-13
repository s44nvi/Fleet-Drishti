from dataclasses import dataclass


@dataclass
class GPSPoint:
    lat: float
    lng: float


class SimulatedGPS:
    def __init__(self, lat: float = 19.0760, lng: float = 72.8777):
        self.point = GPSPoint(lat=lat, lng=lng)

    def get_location(self, timestamp_seconds: float) -> GPSPoint:
        return self.point