from event_queue import (
    init_queue,
    enqueue_event,
    get_queued_events,
    remove_event,
)


def test_queue_starts_empty(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "event_queue.DB_PATH",
        tmp_path / "test_queue.db",
    )

    init_queue()

    assert get_queued_events() == []


def test_event_can_be_queued(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "event_queue.DB_PATH",
        tmp_path / "test_queue.db",
    )

    init_queue()

    event = {
        "type": "road_defect",
        "subtype": "pothole",
        "confidence": 0.9,
    }

    enqueue_event(event)

    queued = get_queued_events()

    assert len(queued) == 1
    assert queued[0]["event"] == event


def test_queued_event_can_be_removed(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "event_queue.DB_PATH",
        tmp_path / "test_queue.db",
    )

    init_queue()

    event = {
        "type": "road_defect",
        "subtype": "pothole",
        "confidence": 0.9,
    }

    enqueue_event(event)

    queued = get_queued_events()

    assert len(queued) == 1

    remove_event(queued[0]["id"])

    assert get_queued_events() == []
