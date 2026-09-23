#!/usr/bin/env python3
"""
Standalone dev tool: run the traffic-detection YOLO model (models/best.pt)
against an image or video, turn each detection into an EventCreate-shaped
payload, and POST it to a running backend to watch event->issue fusion
happen in real time.

This is a throwaway local testing harness, not part of the app or test
suite. It is not wired into any CI/pytest run.

Usage:
    python tools/dev_test_events.py <path/to/image_or_video> [--conf 0.4]
        [--api-url http://127.0.0.1:8000]
"""

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

# Same test UUIDs used in tests/test_fusion.py, so events line up with
# existing test/demo data.
BUS_1 = "fff745f2-138e-47e2-a9dd-b7dd43e13621"
ROUTE_1 = "76322705-b364-4cc1-9e0f-d2182c755856"
CAMERA_1 = "783ecb97-91f5-414a-ab4d-3ac2b930f4a5"

# Same admin credentials used by the existing test suite.
ADMIN_EMAIL = "admin@citylens.com"
ADMIN_PASSWORD = "admin123"

# Fixed placeholder GPS location for every event this tool sends.
PLACEHOLDER_LAT = 19.0760
PLACEHOLDER_LNG = 72.8777

MODEL_PATH = "models/best.pt"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run YOLO detection on an image/video and POST resulting "
        "events to a running Fleet-Drishti backend for manual fusion testing."
    )
    parser.add_argument(
        "source",
        help="Path to an image or video file to run inference on.",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.4,
        help="Confidence threshold for detections (default: 0.4).",
    )
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8000",
        help="Base URL of the running backend (default: http://127.0.0.1:8000).",
    )
    return parser.parse_args()


def get_token(api_url: str) -> str:
    response = requests.post(
        f"{api_url}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    response.raise_for_status()
    return response.json()["access_token"]


def build_event_payload(class_name: str, confidence: float) -> dict:
    # PROVISIONAL: type/subtype naming below is a placeholder mapping
    # from the YOLO model's own class names (pedestrian/2-wheeler/
    # 3-wheeler/4-wheeler) onto the existing type/subtype event fields.
    # This has NOT been confirmed with the ML team yet (expected
    # tomorrow) and is likely to change once they respond - do not
    # treat "traffic" as a finalized event type.
    return {
        "type": "traffic",
        "subtype": class_name,
        "confidence": confidence,
        "timestamp": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "gps": {
            "lat": PLACEHOLDER_LAT,
            "lng": PLACEHOLDER_LNG,
        },
        "bus_id": BUS_1,
        "route_id": ROUTE_1,
        "camera_id": CAMERA_1,
    }


def run_detection(source: str, conf: float):
    from ultralytics import YOLO

    if not Path(MODEL_PATH).exists():
        print(f"Model file not found at {MODEL_PATH}. Nothing to run.")
        sys.exit(1)

    model = YOLO(MODEL_PATH)
    results = model(source, conf=conf)

    detections = []
    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            box_confidence = float(box.conf[0])
            detections.append((class_name, box_confidence))

    return detections


def post_event(api_url: str, token: str, payload: dict):
    response = requests.post(
        f"{api_url}/events",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    return response


def main():
    args = parse_args()

    print(f"Loading model from {MODEL_PATH} and running inference on {args.source} "
          f"(conf >= {args.conf})...")
    detections = run_detection(args.source, args.conf)

    if not detections:
        print("No detections above the confidence threshold. Nothing to send.")
        return

    print(f"Found {len(detections)} detection(s) above threshold.\n")

    try:
        token = get_token(args.api_url)
    except requests.exceptions.ConnectionError:
        print(
            f"\nCould not reach the backend at {args.api_url}.\n"
            "Start it first, e.g.: uvicorn app.main:app --port 8000\n"
        )
        sys.exit(1)
    except requests.exceptions.HTTPError as exc:
        print(f"\nLogin failed: {exc}\n")
        sys.exit(1)

    # Tracks issue_ids seen earlier in this run, so we can tell "matched
    # an issue we already saw this run" apart from "brand new or matched
    # something from before this run" - the API doesn't expose a
    # created-vs-matched flag directly, so this is the honest signal
    # available without guessing.
    seen_issue_ids = set()

    for class_name, confidence in detections:
        payload = build_event_payload(class_name, confidence)

        try:
            response = post_event(args.api_url, token, payload)
        except requests.exceptions.ConnectionError:
            print(
                f"\nCould not reach the backend at {args.api_url}.\n"
                "Start it first, e.g.: uvicorn app.main:app --port 8000\n"
            )
            sys.exit(1)

        print(f"POST /events -> subtype={class_name} confidence={confidence:.2f} "
              f"-> status {response.status_code}")

        if response.status_code == 201:
            event = response.json()
            issue_id = event.get("issue_id")

            if issue_id in seen_issue_ids:
                fusion_note = "matched an issue already seen this run"
            else:
                fusion_note = "new issue_id this run (freshly created, or matched a pre-existing issue)"
            if issue_id:
                seen_issue_ids.add(issue_id)

            print(f"  event_id={event.get('id')} issue_id={issue_id} ({fusion_note})")

            if issue_id:
                issue_response = requests.get(
                    f"{args.api_url}/issues/{issue_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if issue_response.status_code == 200:
                    issue = issue_response.json()
                    print(
                        f"  issue confidence={issue.get('confidence')} "
                        f"priority={issue.get('priority')} "
                        f"severity={issue.get('severity')}"
                    )
        else:
            print(f"  response body: {response.text}")

        print()


if __name__ == "__main__":
    main()
