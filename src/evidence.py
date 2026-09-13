from pathlib import Path

import cv2


EVIDENCE_DIR = Path("evidence")


def save_detection_frame(frame, frame_number: int) -> str:
    """
    Save the frame that generated an event.

    Returns the local path to the saved evidence image.
    """
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

    filename = EVIDENCE_DIR / f"detection_frame_{frame_number}.jpg"

    success = cv2.imwrite(str(filename), frame)

    if not success:
        raise RuntimeError(
            f"Failed to save evidence frame: {filename}"
        )

    return str(filename)