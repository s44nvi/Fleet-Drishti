import numpy as np

from motion_gate import MotionGate, work_size


# 100 x 100 frames: 10,000 pixels, so 1% is exactly 100 pixels.
HEIGHT = 100
WIDTH = 100


def make_frame(value=100, changed_pixels=0, changed_value=200):
    """A flat BGR frame with the first `changed_pixels` pixels altered."""
    frame = np.full((HEIGHT, WIDTH, 3), value, dtype=np.uint8)

    flat = frame.reshape(-1, 3)
    flat[:changed_pixels] = changed_value

    return frame


def make_gate(**overrides):
    settings = {
        "enabled": True,
        "diff_threshold": 1.0,
        "pixel_noise_threshold": 25,
        "max_gap_seconds": 1.0,
    }
    settings.update(overrides)

    return MotionGate(**settings)


def test_first_frame_is_processed():
    gate = make_gate()

    assert gate.should_process(make_frame(), 0.0) is True


def test_identical_frames_are_gated_out():
    gate = make_gate()

    assert gate.should_process(make_frame(), 0.0) is True
    assert gate.should_process(make_frame(), 0.2) is False
    assert gate.should_process(make_frame(), 0.4) is False


def test_large_changed_region_passes():
    gate = make_gate()
    moved = make_frame()
    moved[20:70, 20:70] = 220  # 25% of the frame

    assert gate.should_process(make_frame(), 0.0) is True
    assert gate.should_process(moved, 0.2) is True


def test_max_gap_forces_a_pass_on_a_static_scene():
    gate = make_gate(max_gap_seconds=1.0)

    assert gate.should_process(make_frame(), 0.0) is True

    for timestamp in (0.2, 0.4, 0.6, 0.8):
        assert gate.should_process(make_frame(), timestamp) is False

    assert gate.should_process(make_frame(), 1.0) is True

    # The forced pass restarts the gap
    assert gate.should_process(make_frame(), 1.2) is False


def test_change_exactly_at_threshold_is_gated_out():
    gate = make_gate(diff_threshold=1.0)

    assert gate.should_process(make_frame(), 0.0) is True
    assert gate.should_process(make_frame(changed_pixels=100), 0.2) is False


def test_change_just_over_threshold_passes():
    gate = make_gate(diff_threshold=1.0)

    assert gate.should_process(make_frame(), 0.0) is True
    assert gate.should_process(make_frame(changed_pixels=101), 0.2) is True


def test_pixel_change_at_noise_threshold_is_ignored():
    gate = make_gate(pixel_noise_threshold=25)
    noisy = make_frame(changed_pixels=5000, changed_value=125)
    changed = make_frame(changed_pixels=5000, changed_value=126)

    assert gate.should_process(make_frame(value=100), 0.0) is True
    assert gate.should_process(noisy, 0.2) is False
    assert gate.should_process(changed, 0.4) is True


def test_difference_is_against_last_processed_frame():
    # Each frame moves only 60 pixels on from the one before, which never
    # trips a 1% threshold on its own. Against the last *processed*
    # frame the change adds up and gets through.
    gate = make_gate(diff_threshold=1.0)

    assert gate.should_process(make_frame(), 0.0) is True
    assert gate.should_process(make_frame(changed_pixels=60), 0.2) is False
    assert gate.should_process(make_frame(changed_pixels=120), 0.4) is True


def test_disabled_gate_processes_everything():
    gate = make_gate(enabled=False)

    for timestamp in (0.0, 0.2, 0.4):
        assert gate.should_process(make_frame(), timestamp) is True


def test_grayscale_frames_are_supported():
    gate = make_gate()
    still = np.full((HEIGHT, WIDTH), 100, dtype=np.uint8)
    moved = still.copy()
    moved[:50] = 200

    assert gate.should_process(still, 0.0) is True
    assert gate.should_process(still, 0.2) is False
    assert gate.should_process(moved, 0.4) is True


def test_large_frames_are_shrunk_before_differencing():
    assert work_size(1920, 1080, 320) == (320, 180)
    assert work_size(100, 100, 320) == (100, 100)

    gate = make_gate()
    still = np.full((720, 1280, 3), 100, dtype=np.uint8)
    moved = still.copy()
    moved[200:500, 400:800] = 220

    assert gate.should_process(still, 0.0) is True
    assert gate.should_process(still, 0.2) is False
    assert gate.should_process(moved, 0.4) is True


def test_frame_size_change_forces_a_pass():
    gate = make_gate()
    small = np.full((50, 50, 3), 100, dtype=np.uint8)

    assert gate.should_process(make_frame(), 0.0) is True
    assert gate.should_process(small, 0.2) is True
