import cv2
import numpy as np

from annotate import AnnotatedVideoWriter
from detectors.base import Detection


def make_source(path, frames=10, width=320, height=240):
    writer = cv2.VideoWriter(
        str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10.0, (width, height)
    )

    for _ in range(frames):
        writer.write(np.zeros((height, width, 3), dtype=np.uint8))

    writer.release()


def test_output_has_every_source_frame_and_carries_boxes_forward(tmp_path):
    source = tmp_path / "source.mp4"
    output = tmp_path / "annotated.mp4"
    make_source(source)

    writer = AnnotatedVideoWriter(str(source), str(output), "BUS-TEST")
    writer.record(
        0,
        [Detection("pothole", 0.9, (100, 100, 200, 200))],
        events_sent=1,
    )
    writer.record(5, [], events_sent=1)

    writer.finish()

    capture = cv2.VideoCapture(str(output))
    frames = []

    while True:
        success, frame = capture.read()

        if not success:
            break

        frames.append(frame)

    assert len(frames) == 10

    # The pothole box (red) is still drawn on frame 4, gone on frame 6.
    # Sample a point on the box edge, outside the HUD.
    assert frames[4][150, 100, 2] > 150
    assert frames[6][150, 100, 2] < 100
