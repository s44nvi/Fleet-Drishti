import requests

from config import BACKEND_URL
from event_queue import (
    get_queued_events,
    enqueue_event,
    remove_event,
)


EMAIL = "admin@citylens.com"
PASSWORD = "admin123"


def get_token() -> str:
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={
            "email": EMAIL,
            "password": PASSWORD,
        },
        timeout=10,
    )

    response.raise_for_status()

    return response.json()["access_token"]


def send_event(event: dict) -> dict:
    try:
        token = get_token()

        response = requests.post(
            f"{BACKEND_URL}/events",
            json=event,
            headers={
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )

        response.raise_for_status()

        return response.json()

    except requests.RequestException:
        enqueue_event(event)

        print(
            "Backend unavailable. "
            "Event saved to SQLite queue."
        )

        return {
            "queued": True,
            "event": event,
        }


def send_evidence(
    event_id: str,
    frame_path: str,
    timestamp: str,
    gps: dict,
    bus_id: str,
    route_id: str | None,
    confidence: float,
) -> dict:
    token = get_token()

    payload = {
        "event_id": event_id,
        "frame_path": frame_path,
        "timestamp": timestamp,
        "gps": gps,
        "bus_id": bus_id,
        "route_id": route_id,
        "confidence": confidence,
    }

    response = requests.post(
        f"{BACKEND_URL}/evidence",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
        },
        timeout=10,
    )

    response.raise_for_status()

    return response.json()


def flush_queue():
    queued = get_queued_events()

    if not queued:
        return

    print(f"Retrying {len(queued)} queued event(s)...")

    for item in queued:
        try:
            token = get_token()

            response = requests.post(
                f"{BACKEND_URL}/events",
                json=item["event"],
                headers={
                    "Authorization": f"Bearer {token}",
                },
                timeout=10,
            )

            response.raise_for_status()

            remove_event(item["id"])

            print(
                f"Queued event {item['id']} "
                "sent successfully"
            )

        except requests.RequestException:
            print(
                f"Backend still unavailable. "
                f"Event {item['id']} kept in queue."
            )
            break