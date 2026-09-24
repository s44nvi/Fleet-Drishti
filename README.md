# Fleet-Drishti edge runtime

## Motion gate

`src/motion_gate.py` is a cheap pre-filter that decides whether a frame is
worth running the detectors on at all. It uses plain frame differencing
(OpenCV and numpy only, no model, no GPU).

For each frame that `FRAME_SAMPLE_RATE` has already sampled, the gate:

1. Shrinks it to 320 px wide and converts it to greyscale.
2. Diffs it against the last frame that was actually sent to detection.
3. Counts pixels whose grey level moved by more than
   `MOTION_PIXEL_NOISE_THRESHOLD`.
4. Sends the frame to the detectors only if that share of pixels is above
   `MOTION_DIFF_THRESHOLD` percent.

Whatever the diff says, one frame is always processed every
`MOTION_GATE_MAX_GAP_SECONDS`, so a static-looking scene never leaves the
detectors blind.

The gate comes before detection. `dedup.py` is a different step: it drops
repeated events after a detection has already happened.

At the end of a run, `runner.py` prints how many frames were sampled,
processed and skipped.

| Variable | Default | Meaning |
|---|---|---|
| `MOTION_GATE_ENABLED` | `true` | Set to `false` to send every sampled frame to the detectors |
| `MOTION_DIFF_THRESHOLD` | `2.0` | Percentage (0-100) of changed pixels needed to process a frame |
| `MOTION_PIXEL_NOISE_THRESHOLD` | `25` | Per-pixel grey-level difference (0-255) at or below this is treated as noise |
| `MOTION_GATE_MAX_GAP_SECONDS` | `1.0` | Longest time (video seconds) between two processed frames |

Tests: `cd src && pytest ../tests/test_motion_gate.py`
