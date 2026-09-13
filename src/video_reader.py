import cv2

from config import FRAME_SAMPLE_RATE


def get_video_info(video_path: str) -> dict:
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    cap.release()

    if fps <= 0:
        fps = 30.0

    duration_seconds = frame_count / fps

    return {
        "fps": fps,
        "frame_count": frame_count,
        "duration_seconds": duration_seconds,
    }


def read_video(video_path: str):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 30.0

    frame_number = 0

    try:
        while True:
            success, frame = cap.read()

            if not success:
                break

            if frame_number % FRAME_SAMPLE_RATE == 0:
                yield {
                    "frame_number": frame_number,
                    "timestamp_seconds": frame_number / fps,
                    "frame": frame,
                }

            frame_number += 1

    finally:
        cap.release()