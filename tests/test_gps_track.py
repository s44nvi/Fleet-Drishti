import json

import pytest

from gps_provider import SimulatedGPS, TrackGPS, build_gps_provider

POINTS = [
    {"t": 0, "lat": 19.0, "lng": 72.0},
    {"t": 10, "lat": 19.1, "lng": 72.2},
]


def test_interpolates_between_points():
    point = TrackGPS(POINTS).get_location(5)

    assert point.lat == pytest.approx(19.05)
    assert point.lng == pytest.approx(72.1)


def test_holds_first_and_last_point_outside_the_track():
    track = TrackGPS(POINTS)

    assert track.get_location(-3).lat == 19.0
    assert track.get_location(99).lng == 72.2


def test_empty_track_is_rejected():
    with pytest.raises(ValueError):
        TrackGPS([])


def test_builder_defaults_to_fixed_point_and_uses_file_when_set(tmp_path):
    assert isinstance(build_gps_provider(""), SimulatedGPS)

    path = tmp_path / "track.json"
    path.write_text(json.dumps(POINTS))

    assert isinstance(build_gps_provider(str(path)), TrackGPS)
