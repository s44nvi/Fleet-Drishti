"""
Motion gate: decides whether a sampled frame is worth running the
detectors on at all.

Consecutive frames from a stationary bus are nearly identical, so running
YOLO on every one mostly spends inference on frames that carry no new
information. The gate compares each frame against the last frame that was
actually passed to detection, and only lets it through when enough of the
picture has changed.

This is a different job from dedup.py: dedup suppresses repeat *events*
after a detection has happened, the gate decides whether detection runs.
"""
import cv2
import numpy as np

from config import (
    MOTION_DIFF_THRESHOLD,
    MOTION_GATE_ENABLED,
    MOTION_GATE_MAX_GAP_SECONDS,
    MOTION_PIXEL_NOISE_THRESHOLD,
)


# Frames are shrunk to this width before differencing. Area averaging
# smooths per-pixel sensor noise, and the diff cost stops depending on the
# camera resolution. Frames already this narrow are left as they are.
WORK_WIDTH = 320


def work_size(
    width: int,
    height: int,
    work_width: int = WORK_WIDTH,
) -> tuple[int, int]:
    if width <= work_width:
        return width, height

    return work_width, max(1, round(height * work_width / width))


class MotionGate:
    """
    Frame-differencing pre-filter for the detectors.

    A frame is processed when the share of pixels whose grey level moved
    by more than the noise threshold exceeds the diff threshold, measured
    against the last processed frame (not the previous frame, so slow
    change still adds up and eventually trips the gate).

    Whatever the diff says, a frame is always processed once the max gap
    has passed since the last one - pixel differencing can miss things,
    and the detectors should never go blind on a static-looking scene.

    Work buffers are allocated once per frame size and reused, since this
    runs on every sampled frame.
    """

    def __init__(
        self,
        enabled: bool = MOTION_GATE_ENABLED,
        diff_threshold: float = MOTION_DIFF_THRESHOLD,
        pixel_noise_threshold: int = MOTION_PIXEL_NOISE_THRESHOLD,
        max_gap_seconds: float = MOTION_GATE_MAX_GAP_SECONDS,
        work_width: int = WORK_WIDTH,
    ):
        self.enabled = enabled
        self.diff_threshold = diff_threshold
        self.pixel_noise_threshold = pixel_noise_threshold
        self.max_gap_seconds = max_gap_seconds
        self.work_width = work_width
        self.last_processed_at: float | None = None

        self._frame_shape: tuple | None = None
        self._work_size: tuple[int, int] | None = None
        self._needs_resize = False
        self._scaled: np.ndarray | None = None
        self._current: np.ndarray | None = None
        self._reference: np.ndarray | None = None
        self._diff: np.ndarray | None = None

    def _prepare(self, frame: np.ndarray):
        """(Re)allocate work buffers when the frame geometry changes."""
        if frame.shape == self._frame_shape:
            return

        height, width = frame.shape[:2]
        work_w, work_h = work_size(width, height, self.work_width)

        self._frame_shape = frame.shape
        self._work_size = (work_w, work_h)
        self._needs_resize = (work_w, work_h) != (width, height)

        # Colour frames are shrunk before the grey conversion, which is
        # cheaper than converting at full resolution.
        if self._needs_resize and frame.ndim == 3:
            self._scaled = np.empty(
                (work_h, work_w, frame.shape[2]),
                dtype=np.uint8,
            )
        else:
            self._scaled = None

        self._current = np.empty((work_h, work_w), dtype=np.uint8)
        self._reference = np.empty_like(self._current)
        self._diff = np.empty_like(self._current)

        # The old reference is gone, so the next frame has nothing to be
        # compared against and must be processed.
        self.last_processed_at = None

    def _to_gray(self, frame: np.ndarray):
        """Write the shrunk grey version of the frame into _current."""
        if frame.ndim == 2:
            if self._needs_resize:
                cv2.resize(
                    frame,
                    self._work_size,
                    dst=self._current,
                    interpolation=cv2.INTER_AREA,
                )
            else:
                np.copyto(self._current, frame)
            return

        source = frame

        if self._needs_resize:
            cv2.resize(
                frame,
                self._work_size,
                dst=self._scaled,
                interpolation=cv2.INTER_AREA,
            )
            source = self._scaled

        cv2.cvtColor(source, cv2.COLOR_BGR2GRAY, dst=self._current)

    def _changed_percent(self) -> float:
        cv2.absdiff(self._current, self._reference, dst=self._diff)

        # cv2.THRESH_BINARY keeps values strictly above the threshold,
        # so a difference equal to the noise threshold counts as noise.
        cv2.threshold(
            self._diff,
            self.pixel_noise_threshold,
            255,
            cv2.THRESH_BINARY,
            dst=self._diff,
        )

        return 100.0 * cv2.countNonZero(self._diff) / self._diff.size

    def _accept(self, timestamp_seconds: float) -> bool:
        # The frame just processed becomes the new reference. Swapping
        # the buffers avoids a copy.
        self._reference, self._current = self._current, self._reference
        self.last_processed_at = timestamp_seconds

        return True

    def should_process(
        self,
        frame: np.ndarray,
        timestamp_seconds: float,
    ) -> bool:
        if not self.enabled:
            return True

        self._prepare(frame)
        self._to_gray(frame)

        if self.last_processed_at is None:
            return self._accept(timestamp_seconds)

        gap = timestamp_seconds - self.last_processed_at

        if gap >= self.max_gap_seconds:
            return self._accept(timestamp_seconds)

        if self._changed_percent() > self.diff_threshold:
            return self._accept(timestamp_seconds)

        return False
