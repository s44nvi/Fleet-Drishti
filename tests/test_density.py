from density import (
    DensityMonitor,
    congestion_level,
    mean_confidence,
)
from detectors.base import Detection


def make_vehicles(count, class_name="car", confidence=0.8):
    return [
        Detection(
            class_name=class_name,
            confidence=confidence,
            bbox=(index * 10, 0, index * 10 + 5, 10),
        )
        for index in range(count)
    ]


def make_monitor(**overrides):
    settings = {
        "window_seconds": 10.0,
        "moderate_count": 6,
        "heavy_count": 12,
        "min_gap_seconds": 30.0,
    }
    settings.update(overrides)

    return DensityMonitor(**settings)


def test_mean_confidence_of_empty_list_is_zero():
    assert mean_confidence([]) == 0.0


def test_congestion_level_thresholds():
    assert congestion_level(1.0, 6, 12) == "light"
    assert congestion_level(6.0, 6, 12) == "moderate"
    assert congestion_level(12.0, 6, 12) == "heavy"


def test_light_traffic_emits_nothing():
    monitor = make_monitor()

    assert monitor.update(make_vehicles(2), 0.0) is None
    assert monitor.update(make_vehicles(3), 1.0) is None


def test_moderate_traffic_emits_signal():
    monitor = make_monitor()

    signal = monitor.update(make_vehicles(6), 0.0)

    assert signal is not None
    assert signal.level == "moderate"
    assert signal.average_count == 6.0


def test_sustained_congestion_emits_once():
    monitor = make_monitor()

    first = monitor.update(make_vehicles(8), 0.0)
    second = monitor.update(make_vehicles(8), 1.0)
    third = monitor.update(make_vehicles(8), 2.0)

    assert first is not None
    assert first.level == "moderate"
    assert second is None
    assert third is None


def test_level_change_emits_again():
    monitor = make_monitor()

    moderate = monitor.update(make_vehicles(8), 0.0)
    heavy = monitor.update(make_vehicles(20), 1.0)

    assert moderate.level == "moderate"
    assert heavy is not None
    assert heavy.level == "heavy"


def test_congestion_re_emits_after_min_gap():
    monitor = make_monitor(min_gap_seconds=5.0)

    first = monitor.update(make_vehicles(8), 0.0)
    suppressed = monitor.update(make_vehicles(8), 2.0)
    later = monitor.update(make_vehicles(8), 6.0)

    assert first is not None
    assert suppressed is None
    assert later is not None


def test_signal_carries_counts_and_confidence():
    monitor = make_monitor()

    vehicles = (
        make_vehicles(6, "car", 0.9)
        + make_vehicles(2, "bus", 0.7)
    )

    signal = monitor.update(vehicles, 0.0)

    assert signal.vehicle_count == 8
    assert signal.counts_by_class["car"] == 6
    assert signal.counts_by_class["bus"] == 2
    assert 0.0 < signal.confidence <= 1.0


def test_old_samples_leave_the_window():
    monitor = make_monitor(window_seconds=5.0)

    monitor.update(make_vehicles(20), 0.0)
    monitor.update(make_vehicles(0), 100.0)

    assert monitor.last_level == "light"
    assert len(monitor.samples) == 1


def test_non_vehicle_detections_are_ignored():
    monitor = make_monitor()

    potholes = [
        Detection("pothole", 0.9, (0, 0, 10, 10))
        for _ in range(20)
    ]

    assert monitor.update(potholes, 0.0) is None
