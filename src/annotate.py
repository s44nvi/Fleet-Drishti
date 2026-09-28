"""
Optional annotated-video output (ANNOTATED_VIDEO_PATH), for demos.

Visualisation only: events always come from the real detections. The
detectors run on every Nth frame, so between those frames the most recent
boxes are carried forward to keep the video smooth at the source fps.
Frames the motion gate skipped also just carry the last boxes forward.
"""
import shutil
import subprocess

import cv2

from detectors.base import Detection


# BGR colours per class name.
COLOURS = {
    "pothole": (0, 0, 255),
    "pedestrian": (255, 0, 255),
    "2-wheeler": (255, 200, 0),
    "3-wheeler": (0, 165, 255),
    "4-wheeler": (255, 80, 0),
    "with_helmet": (0, 200, 0),
    "no_helmet": (0, 0, 255),
}
DEFAULT_COLOUR = (200, 200, 200)

LABELS = {
    "with_helmet": "with helmet",
    "no_helmet": "NO HELMET",
}


class AnnotatedVideoWriter:
    def __init__(
        self,
        source_path: str,
        output_path: str,
        bus_label: str = "",
        gps_label: str = "GPS: SIMULATED",
    ):
        self.source_path = source_path
        self.output_path = output_path
        self.bus_label = bus_label
        self.gps_label = gps_label
        # (frame_number, detections, events_sent) in frame order
        self.records: list[tuple[int, list[Detection], int]] = []

    def record(
        self,
        frame_number: int,
        detections: list[Detection],
        events_sent: int,
    ):
        self.records.append((frame_number, list(detections), events_sent))

    def _draw(self, frame, detections, events_sent):
        counts: dict[str, int] = {}

        for detection in detections:
            colour = COLOURS.get(detection.class_name, DEFAULT_COLOUR)
            x1, y1, x2, y2 = (int(value) for value in detection.bbox)
            thickness = 4 if detection.class_name == "pothole" else 2
            label = LABELS.get(detection.class_name, detection.class_name)

            cv2.rectangle(frame, (x1, y1), (x2, y2), colour, thickness)
            cv2.putText(
                frame,
                f"{label} {detection.confidence:.2f}",
                (x1, max(y1 - 8, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                colour,
                2,
            )

            counts[detection.class_name] = (
                counts.get(detection.class_name, 0) + 1
            )

        lines = [
            f"{self.bus_label}   {self.gps_label}".strip(),
            "  ".join(f"{name}: {n}" for name, n in sorted(counts.items()))
            or "no detections",
            f"Events sent: {events_sent}",
        ]

        cv2.rectangle(frame, (0, 0), (760, 34 * len(lines) + 10), (0, 0, 0), -1)

        for index, line in enumerate(lines):
            cv2.putText(
                frame,
                line,
                (12, 32 + 34 * index),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.85,
                (255, 255, 255),
                2,
            )

    def finish(self):
        capture = cv2.VideoCapture(self.source_path)

        if not capture.isOpened():
            raise ValueError(f"Could not open video: {self.source_path}")

        fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

        encoder = self._open_encoder(fps, width, height)

        record_index = -1
        frame_number = 0

        try:
            while True:
                success, frame = capture.read()

                if not success:
                    break

                while (
                    record_index + 1 < len(self.records)
                    and self.records[record_index + 1][0] <= frame_number
                ):
                    record_index += 1

                if record_index >= 0:
                    _, detections, events_sent = self.records[record_index]
                else:
                    detections, events_sent = [], 0

                self._draw(frame, detections, events_sent)
                encoder.write(frame)
                frame_number += 1
        finally:
            capture.release()
            encoder.close()

        return self.output_path

    def _open_encoder(self, fps: float, width: int, height: int):
        if shutil.which("ffmpeg") is None:
            print(
                "ffmpeg not found: writing mp4v (may not open in "
                "QuickTime)"
            )
            return _Mp4vEncoder(self.output_path, fps, width, height)

        return _FfmpegEncoder(self.output_path, fps, width, height)


class _FfmpegEncoder:
    """Pipes raw BGR frames to ffmpeg -> H.264 yuv420p."""

    def __init__(self, path, fps, width, height):
        self.process = subprocess.Popen(
            [
                "ffmpeg", "-v", "error", "-y",
                "-f", "rawvideo", "-pix_fmt", "bgr24",
                "-s", f"{width}x{height}", "-r", str(fps), "-i", "-",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                "-movflags", "+faststart", path,
            ],
            stdin=subprocess.PIPE,
        )

    def write(self, frame):
        self.process.stdin.write(frame.tobytes())

    def close(self):
        self.process.stdin.close()
        self.process.wait()


class _Mp4vEncoder:
    def __init__(self, path, fps, width, height):
        self.writer = cv2.VideoWriter(
            path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height)
        )

    def write(self, frame):
        self.writer.write(frame)

    def close(self):
        self.writer.release()
