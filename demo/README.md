# Demo runbook: real models on iPhone clips

Pipeline shown: iPhone video -> M5 edge inference -> real detections/events ->
backend API -> Event -> Issue fusion -> frontend dashboard.

**Labels that must stay on screen / in narration**
- GPS is **SIMULATED**: the clip's geotag picks the nearest BEST route and the
  bus is moved along that route line at ~25 km/h (`demo/make_gps_track.py`).
  It is not a GPS recording.
- The second bus pass (clip 1 replayed as BUS-027 on the identical track) is a
  **SIMULATED** second observation to show Event -> Issue fusion.
- Annotated videos carry the last detected boxes forward between sampled
  frames so playback is smooth at the source fps. This is visualisation only;
  events come from the real detections on the sampled frames.
- Footage is sample footage. Faces and number plates are clearly visible in
  both clips, so blur or crop before publishing.
- Pothole weight: "pothole detector, provenance as reported" (yolo26m, class
  `Pothole`, trained at imgsz 512). Do not call it the team's M1 model unless
  its provenance is confirmed.

Weights, videos, databases and outputs live **outside** this repo (never commit
them). Paths below assume `~/Downloads/fleetdrishti_demo_output/`.

## 1. One-off setup

```sh
python3 -m venv ~/Downloads/fleetdrishti_demo_venv
source ~/Downloads/fleetdrishti_demo_venv/bin/activate
pip install -r requirements.txt playwright   # requirements pin ultralytics 8.4.128; 8.4.160 also loads all three models
```

Models (copy by MD5, not by filename) into `~/Downloads/fleetdrishti_demo_output/models/`:

| file | MD5 | classes |
|---|---|---|
| vehicle_pedestrian.pt | 55fbbca2c46d6d504f585a8657df0544 | pedestrian, 2-wheeler, 3-wheeler, 4-wheeler |
| helmet.pt | 435a5f1eabd23752b217668bc75b2c14 | With Helmet, Without Helmet |
| pothole.pt | 88674712986be4bed811e3da1d9f8f7d | Pothole |

Videos: the iPhone clips are HLG/Dolby Vision HEVC. Convert to 8-bit SDR H.264
(ffmpeg here has no `zscale`; the plain conversion looks a little flat, but
Apple's `avconvert` tone-map produced a teal sky on this footage):

```sh
ffmpeg -i ~/Downloads/IMG_7729.MOV -map 0:v:0 -an -r 30 -c:v libx264 -crf 17 \
  -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  ~/Downloads/fleetdrishti_demo_output/clips/IMG_7729_sdr.mp4
```

## 2. Demo database + backend (never `citylens_db`)

```sh
cd ~/Downloads/backend
export DATABASE_URL=postgresql://$USER@localhost:5432/citylens_demo
echo "$DATABASE_URL" | grep -q '/citylens_demo$' || { echo "WRONG DB"; exit 1; }   # DB GUARD
createdb citylens_demo                      # first time only
.venv/bin/alembic upgrade head              # env DATABASE_URL overrides alembic.ini
.venv/bin/python -m app.seed_authority
# fleet only (buses/routes/cameras), no synthetic events/issues: call
# get_or_create_route/bus/camera from seed_demo.py for each entry in DEMO_BUSES
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000   # 8000 only if free; the recorded run used 8001
```

Login: `admin@citylens.com` / `admin123`. Get the bus, route and camera IDs from
`GET /buses`, `/routes` (and the seed output) and export them as `BUS_ID`,
`ROUTE_ID`, `CAMERA_ID` for each run.

## 3. GPS tracks (SIMULATED)

```sh
G=~/Downloads/gtfs_compat/mumbai_metropolitan_routes.geojson
T=~/Downloads/fleetdrishti_demo_output/tracks
python3 demo/make_gps_track.py --geojson $G --geotag "+19.1304+072.8968+028.763/" --duration 25.4 --out $T/IMG_7729_track.json
python3 demo/make_gps_track.py --geojson $G --geotag "+19.0930+072.9001+035.754/" --duration 5.0  --out $T/IMG_7755_track.json
```

## 4. Run the pipeline (per clip)

Run from a scratch directory (the runner writes `evidence/` and `edge_queue.db`
into the current directory). Clip 1 = BUS-014, clip 2 = BUS-027; the simulated
second pass is clip 1 again with BUS-027's IDs and the same track file.

```sh
O=~/Downloads/fleetdrishti_demo_output
mkdir -p $O/run/clip1 && cd $O/run/clip1
export BACKEND_URL=http://127.0.0.1:8000   # match the backend port
export BUS_ID=... ROUTE_ID=... CAMERA_ID=...
export DETECTOR_MODE=yolo
export ROAD_DEFECT_MODEL_PATH=$O/models/pothole.pt ROAD_DEFECT_CONFIDENCE=0.35
export ROAD_DEFECT_IMGSZ=960 ROAD_DEFECT_MIN_CENTER_Y=0.5   # see notes below
export VEHICLE_MODEL_PATH=$O/models/vehicle_pedestrian.pt VEHICLE_CONFIDENCE=0.40
export PEDESTRIAN_MODEL_PATH=$O/models/vehicle_pedestrian.pt PEDESTRIAN_CONFIDENCE=0.40
export HELMET_DETECTION_ENABLED=true HELMET_MODEL_PATH=$O/models/helmet.pt HELMET_CONFIDENCE=0.40
export DENSITY_MODERATE_COUNT=5 DENSITY_HEAVY_COUNT=15       # M2-aligned thresholds
export VIDEO_PATH=$O/clips/IMG_7729_sdr.mp4 GPS_TRACK_FILE=$O/tracks/IMG_7729_track.json
export ANNOTATED_VIDEO_PATH=$O/annotated/clip1_bus014_annotated.mp4 ANNOTATED_VIDEO_LABEL=BUS-014
PYTHONPATH=~/Downloads/fleet-drishti-m5-edge/src python -m runner
```

New env flags (all opt-in, defaults unchanged): `VIDEO_PATH`, `GPS_TRACK_FILE`,
`ANNOTATED_VIDEO_PATH` / `ANNOTATED_VIDEO_LABEL` / `ANNOTATED_GPS_LABEL`,
`HELMET_DETECTION_ENABLED` / `HELMET_MODEL_PATH` / `HELMET_CONFIDENCE`,
`ROAD_DEFECT_IMGSZ`, `ROAD_DEFECT_MIN_CENTER_Y`.

- `ROAD_DEFECT_IMGSZ=960`: small road defects were only found at 960 (model
  trained at 512). Costs ~2x pothole inference time.
- `ROAD_DEFECT_MIN_CENTER_Y=0.5`: drops "potholes" whose box centre is in the
  top half of the frame. Without it the model reports large boxes in the sky
  and tree canopy (confidence up to 0.7). It does not remove false positives on
  the road region (e.g. a car door, cobbles).
- Helmet events (`safety_violation` / `no_helmet`) are real model output but
  the helmet model was unreliable on this footage (see RUN_REPORT.md): review
  them before presenting.

## 5. Frontend

```sh
cd ~/Downloads/fleet-drishti-frontend     # branch frontend-backend-integration
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5173
```

Open http://127.0.0.1:5173, log in as above.

Which pages show real backend data:
- Road Issues + issue detail: real Issues (observation count, fused confidence).
  The detail header still says "Single observation" (frontend logic; the
  backend `observation_count` is the fused count).
- Command Center "Latest events", Traffic "Latest observations": real events.
- **Safety is mock data** (real `no_helmet` events do not appear there) and the
  Traffic heatmap / hotspots are labelled DEMO.

Suggested click path: Command Center (Latest events) -> Road Issues -> open the
pothole Issue -> Traffic -> Latest observations -> (narrate that Safety/Traffic
heatmap use demo data) -> play the annotated video alongside.

## 6. Switch back to the real database

Stop the backend, then start it without the override so it reads its own
`.env` (`DATABASE_URL=.../citylens_db`):

```sh
unset DATABASE_URL
cd ~/Downloads/backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Never run alembic/seed with that URL. To discard the demo data:
`dropdb citylens_demo` (only that database).
