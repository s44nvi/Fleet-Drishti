from dedup import Deduplicator
from detectors.base import Detection


def make_detection(
    class_name="pothole",
    confidence=0.9,
    bbox=(100, 100, 200, 200),
):
    return Detection(
        class_name=class_name,
        confidence=confidence,
        bbox=bbox,
    )


def test_first_detection_emits():
    dedup = Deduplicator()
    detection = make_detection()
    assert dedup.should_emit(detection, 0.0) is True


def test_same_detection_is_suppressed():
    dedup = Deduplicator()
    detection = make_detection()
    assert dedup.should_emit(detection, 0.0) is True
    assert dedup.should_emit(detection, 0.2) is False


def test_different_class_emits():
    dedup = Deduplicator()
    pothole = make_detection("pothole")
    crack = make_detection("crack")
    assert dedup.should_emit(pothole, 0.0) is True
    assert dedup.should_emit(crack, 0.2) is True


def test_far_detection_emits():
    dedup = Deduplicator(max_distance=50.0)
    first = make_detection(bbox=(100, 100, 200, 200))
    far_away = make_detection(bbox=(500, 500, 600, 600))
    assert dedup.should_emit(first, 0.0) is True
    assert dedup.should_emit(far_away, 0.2) is True


def test_detection_after_time_gap_emits():
    dedup = Deduplicator(max_gap_seconds=1.0)
    detection = make_detection()
    assert dedup.should_emit(detection, 0.0) is True
    assert dedup.should_emit(detection, 2.0) is True


def test_detection_within_time_gap_is_suppressed():
    dedup = Deduplicator(max_gap_seconds=1.0)
    detection = make_detection()
    assert dedup.should_emit(detection, 0.0) is True
    assert dedup.should_emit(detection, 0.5) is False
