# Fleet-Drishti Setup Guide

Covers the three repos that make up the demo: this backend, the frontend
(separate clone), and the M5 edge pipeline (separate clone). All commands
below were verified against the actual files in each repo as of 2026-09-27.

---

## 1. Backend (`~/Downloads/backend`)

### 1.1 Virtual environment

```bash
cd ~/Downloads/backend
python3 -m venv venv
source venv/bin/activate
```

### 1.2 Dependencies

```bash
pip install -r requirements.txt
```

`requirements-dev.txt` is **not** needed to run the backend itself. It only
adds `ultralytics` (and the torch/torchvision/opencv it pulls in), which is
used solely by `tools/dev_test_events.py`, a throwaway YOLO test harness.
Install it only if you're using that script:

```bash
pip install -r requirements.txt -r requirements-dev.txt
```

### 1.3 Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Relevant vars (see `.env.example` for full comments):

- `DATABASE_URL` — Postgres connection string, e.g.
  `postgresql://username:password@localhost:5432/citylens_db`
- `ENV` — `development` / `staging` / `production`
- `JWT_SECRET_KEY` — signs JWT access tokens (read directly via `os.getenv`
  in `app/services/auth_service.py`, not through `Settings`). Falls back to
  an insecure dev default if unset — always set a real value outside local
  dev.
- `CORS_ORIGINS` — comma-separated list of allowed frontend origins.

**Gotcha (already fixed):** `app/config.py`'s `Settings` class sets
`extra = "ignore"` in its `Config`. This matters because `.env` carries vars
(like `JWT_SECRET_KEY`) meant for other consumers, not for the `Settings`
model itself — without `extra = "ignore"`, pydantic-settings would crash on
startup with any extra env var present. This is already in place; no action
needed, just don't remove it.

### 1.4 Postgres

Create the database referenced by `DATABASE_URL` (default name
`citylens_db`). Any local Postgres instance works — nothing exotic here
(`alembic.ini`'s own default `sqlalchemy.url` is
`postgresql://akshaykumar@localhost:5432/citylens_db`, but the app always
uses `DATABASE_URL` from `.env`).

### 1.5 Run migrations

```bash
alembic upgrade head
```

### 1.6 Seed data

Two seed scripts, run in this order:

```bash
python -m app.seed_authority   # creates the admin login (see below)
python seed_demo.py            # creates demo buses/routes/cameras/events/issues
```

`seed_authority.py` creates one Authority record:
- Email: `admin@citylens.com`
- Password: `admin123`
- Role: `admin`

It's idempotent — if that email already exists, it prints "Authority
already exists" and does nothing.

`seed_demo.py` creates two demo buses (`BUS-014` on route `R-22`
Andheri–Colaba, `BUS-027` on route `R-45` Bandra–Powai) with cameras, and
generates demo events/issues/citizen reports against them.

### 1.7 Start the server

```bash
uvicorn app.main:app --reload
```

### 1.8 Confirm it's up

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

---

## 2. Frontend (`~/Downloads/fleet-drishti-frontend`)

This is a **separate local clone**, not a subdirectory of this repo.

### 2.1 Which branch to use

- `frontend-backend-integration` — the version wired to the real backend
  (real JWT auth, real API calls for Road Issues / Issue detail / Live Map /
  Command Center's event feed). **Use this branch for the demo.**
- `new-frontend` — the original, backend-agnostic version (all mock data).

```bash
cd ~/Downloads/fleet-drishti-frontend
git checkout frontend-backend-integration
```

### 2.2 Install and run

```bash
npm install
npm run dev
```

This starts Vite (default `http://localhost:5173`).

### 2.3 Login

Use the seeded admin credentials (see §1.6):
- Email: `admin@citylens.com`
- Password: `admin123`

The backend must already be running (§1.7) and `CORS_ORIGINS` must include
the frontend's origin (`http://localhost:5173` is in the `.env.example`
default).

---

## 3. M5 edge pipeline (`~/Downloads/fleet-drishti-m5-edge`)

Also a separate local clone. Branch: `m5-edge-runtime`.

### 3.1 Entry point

```bash
cd ~/Downloads/fleet-drishti-m5-edge
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cd src
python runner.py
```

### 3.2 CRITICAL gotcha: hardcoded video path

`src/runner.py` line 22 hardcodes:

```python
VIDEO_PATH = "sample.mp4"
```

There is **no CLI flag or env var** to override this. To run the pipeline
against a specific video, you must copy/rename that file to
`src/sample.mp4` before running `runner.py`. There's no need to keep it
there afterward — `*.mp4` is gitignored.

### 3.3 Environment variables (`src/config.py`)

Current defaults (all overridable via env var):

| Var | Default | Notes |
|---|---|---|
| `BUS_ID` | `fff745f2-138e-47e2-a9dd-b7dd43e13621` | Already matches a real backend Bus record from `seed_demo.py`. |
| `ROUTE_ID` | `76322705-b364-4cc1-9e0f-d2182c755856` | Already matches a real backend Route record. |
| `CAMERA_ID` | `783ecb97-91f5-414a-ab4d-3ac2b930f4a5` | Backend has no `/cameras` endpoint and does not validate this value — any UUID-shaped string works. |
| `BACKEND_URL` | `http://127.0.0.1:8000` | Points at the local backend by default. |
| `DETECTOR_MODE` | `mock` | See §3.4 below for `yolo` mode. |

If your local `seed_demo.py` data differs (e.g. re-seeded database with new
UUIDs), fetch the real IDs from the backend and override these via env
vars rather than editing `config.py`.

### 3.4 `DETECTOR_MODE=yolo` limitation

Setting `DETECTOR_MODE=yolo` loads real YOLO weights instead of the mock
detector, but the model paths default to generic COCO weights
(`ROAD_DEFECT_MODEL_PATH=models/road_defect_yolov8.pt`,
`VEHICLE_MODEL_PATH=yolov8n.pt`, `PEDESTRIAN_MODEL_PATH=yolov8n.pt`) — these
are **not** the real trained road-defect/pedestrian-hazard models. Object
classes detected won't map meaningfully onto Fleet-Drishti's taxonomy in
this mode. This is a known, accepted limitation for the current demo; the
real M1/M2 models are presented separately (see `DEMO_NOTES.md`).

`DETECTOR_MODE=mock` (the default) is what's used for end-to-end pipeline
demos — it fabricates detections so the rest of the pipeline (motion gate →
dedup → event formatting → backend posting → offline queue fallback) can be
exercised without real model weights or a GPU.
