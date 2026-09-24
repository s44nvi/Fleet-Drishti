# Fleet-Drishti — Edge AI Runtime Work Log

Branch: `m5-edge-runtime` (base: `main`)
Log generated: 2026-09-24. Built from the git history and the current working tree.

---

## 1. Commit `225ba2a` — Build edge AI runtime pipeline (2026-09-13 14:30)

Base pipeline that runs on the bus: it reads the video, detects objects, turns them into events and sends them to the M4 backend.

| File | Purpose |
|---|---|
| `src/config.py` | Bus, route and camera IDs, `BACKEND_URL` and `FRAME_SAMPLE_RATE`, all read from env vars |
| `src/video_reader.py` | OpenCV video reader that samples every Nth frame and reports fps and duration |
| `src/detectors/base.py` | `Detection` dataclass and abstract `Detector` interface |
| `src/detectors/mock_detector.py` | Mock detector that always returns a pothole, so the pipeline runs without a model |
| `src/dedup.py` | `Deduplicator`: stops one object from raising an event on every frame (same class, nearby box centre, within a time window) |
| `src/gps_provider.py` | `SimulatedGPS` that returns a fixed point in Mumbai |
| `src/event_formatter.py` | Builds the `road_defect` payload for `POST /events` |
| `src/evidence.py` | Saves the frame that triggered an event to `evidence/` |
| `src/event_queue.py` | SQLite offline queue (`edge_queue.db`) for events sent while the backend is down |
| `src/backend_client.py` | Logs in, sends the event, then uploads the evidence; queues on failure and has `flush_queue()` |
| `src/runner.py` | Main loop: video → detect → dedup → evidence → send |

## 2. Commit `067da98` — Build edge AI runtime reliability and tests (2026-09-13 14:58)

- More reliable `backend_client.py`, `dedup.py` and `runner.py` (handling for queued and failed sends).
- New tests: `test_dedup.py`, `test_event_formatter.py`, `test_event_queue.py` and `test_video_reader.py`.

---

## 3. Uncommitted work (current working tree)

### 3.1 Real detectors (YOLO, with mock fallback)
- `src/detectors/yolo_backend.py`: thin ultralytics wrapper with a model cache. ultralytics is only imported when a YOLO model is used, so mock mode needs neither the library nor a GPU.
- `src/detectors/road_defect_detector.py`: YOLO road-defect detector that maps model labels to our defect classes. It needs fine-tuned weights, which do not exist yet (see TODO).
- `src/detectors/vehicle_detector.py`: car, bus, truck and two-wheeler detection using COCO `yolov8n.pt`, plus `count_by_class()`.
- `src/detectors/pedestrian_detector.py`: pedestrian detection with COCO "person" mapped to `pedestrian`.
- Each detector has a `build_*_detector()` factory that `DETECTOR_MODE` switches between `mock` (the default) and `yolo`.

### 3.2 Analytics signals
- `src/density.py`: `DensityMonitor` uses a rolling average vehicle count to classify congestion as light, moderate or heavy. A minimum gap between events prevents spam.
- `src/pedestrian_safety.py`: `PedestrianHazardMonitor` checks whether a pedestrian is in the bus path (a centre-bottom zone) and how close they are (box height). It reports `crossing_ahead`, `group_crossing` or `close_pedestrian`.
- `src/tracker.py`: greedy IOU tracker (no Kalman filter). It measures per-track speed and counts direction changes.
- `src/incident.py`: `IncidentMonitor` flags rash driving (speed or weaving) and suspected hit-and-run (a fast vehicle track overlapping a pedestrian). Both are heuristics.
- `src/anpr.py`: number-plate reading from the vehicle crop. It uses EasyOCR (imported only when needed) or a mock reader, validates Indian plate formats and keeps OCR confidence separate from detection confidence.

### 3.3 Modified files
- `src/config.py`: new env-configurable settings for detector mode, model paths and confidence levels, the density window and thresholds, the hazard zone, tracker and incident thresholds, and ANPR.
- `src/event_formatter.py`: shared `build_event()`, plus `density_to_event()` and `hazard_to_event()`. The new event types are `traffic_density` and `pedestrian_hazard`.
- `src/runner.py`: runs all three detectors on each frame, feeds the density and hazard monitors, sends events through a shared `emit_event()` and tracks counts in `PipelineStats`.
- `requirements.txt` (new): opencv, numpy and requests as the core; ultralytics and torch for YOLO; easyocr for ANPR; pytest for tests.

### 3.4 New tests
`test_density.py`, `test_pedestrian_safety.py`, `test_road_defect_detector.py`, `test_vehicle_detector.py`, and an extended `test_event_formatter.py`.

---

## 4. Current status

**Test run (2026-09-24, `cd src && pytest ../tests`): 55 passed, 2 failed.**
- The 2 failures are in `test_video_reader.py`: `ValueError: Could not open video: sample.mp4`. The file `sample.mp4` is not in the repo, so these tests fail because the video is missing, not because of a code bug.

## 5. Open items / TODO
- [ ] **`tracker.py`, `incident.py` and `anpr.py` are not wired into `runner.py` yet**, and they have no tests.
- [ ] Add a `sample.mp4` test fixture, or make the video tests skip when the file is missing.
- [ ] Train or obtain fine-tuned road-defect weights for all six classes (pothole, damaged road, missing divider, missing zebra crossing, damaged signboard, waterlogging).
- [ ] School-child vs adult classification needs fine-tuned pedestrian weights.
- [ ] Incident speed is measured in image space. Replace it with a trained model or a ground-plane homography before using it for enforcement.
- [ ] `backend_client.py` has hardcoded admin credentials (`admin@citylens.com` / `admin123`). Move them to env vars.
- [ ] `README.md` is empty.
- [ ] Commit the uncommitted work above.
