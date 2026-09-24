# Fleet-Drishti / CityLens — Repository Status Update

**Repo:** github.com/s44nvi/Fleet-Drishti
**Report date:** 2026-09-24
**Method:** I ran `git fetch origin --prune` and then checked out every remote branch into its own temporary `git worktree`, so the uncommitted work on the local `m5-edge-runtime` checkout was left alone. For each branch I read the code, installed its dependencies in isolated venvs or `node_modules`, and ran its tests and build. For the backend I also started a **throwaway PostgreSQL 18 cluster** on port 55432, applied all Alembic migrations, seeded it, started the API, and drove it both from its own test suite and from the real edge runner. Every claim below marked *verified* was observed in that run. Nothing was pushed, and all temporary worktrees, DBs and servers were removed afterwards.

> **One-paragraph summary.** The backend (M4) is the most complete piece. It is a real FastAPI + Postgres service with auth, event ingestion, noisy-OR issue fusion, evidence metadata, citizen reports and analytics, and 24/24 of its tests pass once they are pointed at a correctly seeded DB. The edge runtime (M5) works end to end in **mock mode** and successfully posted events and evidence records to the live backend in my test. However, about 60% of it is **uncommitted** on one laptop, its offline queue is broken, and its default config crashes on first run. **There is no trained model anywhere in the repo:** no weights, no dataset, no `classes.txt`, no training code and no sample video. Every "detection" today comes from a mock that emits a pothole on every frame regardless of what the frame shows. The frontend (M3) is a polished, buildable React/MapLibre UI, but it is **100% mock data with zero backend calls**, no login screen and no citizen-reporting screen, and its data model does not match the backend's field names or vocabularies. So the "video → pin on map" slice currently breaks at two places: real detection (no model) and backend → map (not wired).

---

## Table of contents
1. [Branch inventory](#1-branch-inventory)
2. [Branch: `main`](#2-branch-main)
3. [Branch: `proj_context`](#3-branch-proj_context)
4. [Branch: `backend` (M4)](#4-branch-backend-m4)
5. [Branch: `m5-edge-runtime` (M5, plus M2 logic)](#5-branch-m5-edge-runtime-m5--m2-logic)
6. [Branch: `new-frontend` (M3)](#6-branch-new-frontend-m3)
7. [Branch: `old-ui` (M3, superseded backup)](#7-branch-old-ui-m3-superseded-backup)
8. [Cross-check against team roles (M1–M6)](#8-cross-check-against-team-roles-m1m6)
9. [Integration check (payload/schema mismatches)](#9-integration-check-payloadschema-mismatches)
10. [Vertical slice trace](#10-vertical-slice-trace)
11. [Open items, ranked by what they block](#11-open-items-ranked-by-what-they-block)

---

## 1. Branch inventory

| Branch | Remote? | Head | Last commit | Commits | Shares history with `main`? | Author(s) |
|---|---|---|---|---|---|---|
| `main` | yes | `ee15c36` | 2026-09-12 | 1 | — | saanvi |
| `backend` | yes | `80dfa32` | 2026-09-23 | 23 (+1 from main) | yes, forked from `ee15c36` | HaleHenry-rig |
| `m5-edge-runtime` | yes | `067da98` | 2026-09-13 | 2 | **no, orphan branch** | HaleHenry-rig |
| `proj_context` | yes | `b7a3cf4` | 2026-09-12 | 1 (+1 from main) | yes | Hdawgg |
| `new-frontend` | yes, **new since last fetch** | `1ea1e11` | 2026-09-24 | 3 | **no, orphan branch** | saanvi |
| `old-ui` | yes, **new since last fetch** | `6a2eb87` | 2026-09-24 | 1 | **no, orphan branch** | saanvi |
| `edge` | **local only** | `47a7065` | 2026-09-13 | — | — | stale copy of `backend` as of 2026-09-13; contains no edge code despite the name |

Branch-hygiene notes:
- Local `backend` is **10 commits behind** `origin/backend`, which picked up the noisy-OR fusion rewrite and the `.env.example`/CORS changes on 2026-09-22/23. Anyone running the backend from a local checkout without pulling is on the old fusion logic.
- `m5-edge-runtime`, `new-frontend` and `old-ui` have **no common ancestor with `main`**. Merging any of them into `main` will need `--allow-unrelated-histories` or a rebase onto `main`. Nothing has been merged into `main` yet; `main` is still just the initial README.
- The `backend` and `m5-edge-runtime` branches use top-level `app/` and `src/` respectively, with no subfolder. If they were ever merged into one tree they would not collide on paths, but both have a root `README.md` and `.gitignore` that will conflict.

---

## 2. Branch: `main`

**Commits**
| Hash | Date | Message |
|---|---|---|
| `ee15c36` | 2026-09-12 | Initial commit |

**Files:** `README.md` only, with two lines: the title and "AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet".

- Uncommitted work: none (inspected via a clean worktree).
- Dependencies, tests, code: none.
- README: title plus one-line tagline only, with no setup, architecture or ownership information.
- **Status: empty placeholder.** No integration branch exists yet.

---

## 3. Branch: `proj_context`

**Commits**
| Hash | Date | Message |
|---|---|---|
| `b7a3cf4` | 2026-09-12 | Create context.md for project context management |
| `ee15c36` | 2026-09-12 | Initial commit |

**Files:** `README.md` (identical to main) and `context.md`.

- `context.md` contains a single line: *"Enter proj context in this file, update it after prompts or work session"*. **It is a placeholder with no actual project context.**
- No code, tests or dependencies. Nothing uncommitted.
- **Status: empty.** The only real project documentation that exists is `API_INTEGRATION.md` on `backend`, `WORK_LOG.md` (uncommitted) on the M5 laptop, and `design-system/fleet-drishti/MASTER.md` on `new-frontend`.

---

## 4. Branch: `backend` (M4)

### 4.1 Commit history
| Hash | Date | Message |
|---|---|---|
| `80dfa32` | 2026-09-23 | Restore .venv/ and .DS_Store to .gitignore (present in old master, dropped in backend rewrite) |
| `27bdbaf` | 2026-09-23 | Bucket severity into labels, make CORS origins configurable, refresh docs |
| `0a770ac` | 2026-09-22 | Add pytest.ini so tests find the app package without manual PYTHONPATH |
| `115808f` | 2026-09-22 | Colocate tunable fusion/priority constants |
| `95b4aff` | 2026-09-22 | Pin requests to a real 2.32.x release; add .env.example |
| `4a6b27a` | 2026-09-22 | Add/update fusion and citizen-report tests for noisy-OR rewrite |
| `e020c5b` | 2026-09-22 | Wire citizen reports into noisy-OR issue fusion |
| `c75a06d` | 2026-09-22 | Rewrite issue fusion as sequential noisy-OR, decouple priority |
| `a276b19` | 2026-09-22 | Normalize naive/aware datetimes in issue_service |
| `fdba4e8` | 2026-09-22 | Add Issue.confidence field with migration |
| `47a7065` | 2026-09-13 | Complete evidence validation and citizen report tests |
| `e668422` | 2026-09-13 | Add backend API integration guide |
| `f05715d` | 2026-09-13 | Improve issue status validation and tests |
| `1317976` | 2026-09-13 | Fix demo seed datetime handling |
| `ac13de6` | 2026-09-13 | Add backend demo data seed |
| `ca1488b` | 2026-09-13 | Enable frontend CORS |
| `f0802be` | 2026-09-13 | Add evidence API integration test |
| `287bf12` | 2026-09-13 | Add backend API and fusion tests |
| `83606f4` | 2026-09-13 | Add requests dependency for integration tests |
| `a5cfc37` | 2026-09-13 | Add M5 event flow integration test |
| `819eb88` | 2026-09-12 | Complete authentication and analytics |
| `289d441` | 2026-09-12 | Complete citizen reports and priority scoring |
| `66764f4` | 2026-09-12 | Add Fleet Drishti backend |
| `ee15c36` | 2026-09-12 | Initial commit |

### 4.2 Files (49), grouped

**App entry and config**
- `app/main.py`: creates the FastAPI app ("CityLens Backend (M4)"), adds CORS from `settings.cors_origins`, mounts 7 routers, and exposes `GET /health`.
- `app/config.py`: pydantic-settings `Settings` with `database_url` (required), `env`, and `cors_origins` (defaults to localhost dev ports), reading `.env`.
- `app/database.py`: SQLAlchemy engine, `SessionLocal`, declarative `Base`, and the `get_db()` dependency.

**Data model** (`app/models/core.py`), all with UUID primary keys:
- `Bus` (`bus_code` unique, `route_id`), `Route` (`route_code`, `name`), `Camera` (`camera_code`, `bus_id`).
- `Event`: `type`, `subtype`, `confidence`, `lat`, `lng`, `timestamp`, `bus_id` (FK, required), `route_id`, `camera_id`, `issue_id`. This is one raw observation.
- `Issue`: the fused persistent problem, with `type`, `subtype`, `lat`, `lng`, `severity` (a label), `priority` (0–100), `confidence` (noisy-OR), `status` (default `"unresolved"`), `first_seen` and `last_seen`.
- `Evidence`: `event_id`, `frame_path`, `video_path`, `timestamp`, `lat`, `lng`, `bus_id`, `route_id`, `confidence`. **These are string paths only; no file bytes are stored.**
- `CitizenReport`: `description`, `photo_path`, `video_path`, `timestamp`, `lat`, `lng`, `status`, `matched_issue_id`.
- `Authority`: `name`, `email`, `password_hash` (bcrypt), `role`.

**Schemas** (`app/schemas/core.py`, `auth.py`): the Pydantic request/response models. `EventCreate` is the M5 contract (see §9).

**Routes** (`app/routes/*`). Every GET requires a JWT; POSTs to events and evidence require role `admin` or `authority`.
| Endpoint | Auth | What it does |
|---|---|---|
| `POST /auth/login` | none | Checks email and bcrypt password, returns an HS256 JWT (60 min) plus role |
| `POST /events` | authority | Validates that `bus_id` exists, stores the Event, then runs issue fusion |
| `GET /events`, `GET /events/{id}` | any JWT | Lists events ordered by timestamp desc, with skip/limit |
| `GET /issues`, `GET /issues/{id}` | any JWT | Lists issues ordered by `last_seen` desc |
| `PATCH /issues/{id}/status` | authority | Sets status to **any string** (no validation, see bugs) |
| `POST /evidence`, `GET /evidence[/{id}]` | authority / JWT | Metadata-only evidence records; validates that the event and bus exist |
| `POST /citizen-reports` | **none (public)** | Stores the report and spatially matches it to the nearest issue within 50 m of any type; if matched, fuses 0.6 × 0.5 into confidence |
| `GET /citizen-reports` | any JWT | Lists reports |
| `GET /buses`, `/buses/{id}`, `/routes` | any JWT | Read-only fleet lists. **There are no create/update endpoints**; buses and routes only come from the seed script |
| `GET /analytics[/defects|/congestion|/routes|/coverage]` | any JWT | Simple `COUNT`/`GROUP BY` aggregates |

**Services** (`app/services/*`)
- `issue_service.py` is the real logic, and it is non-trivial:
  - **Matching:** an event joins an existing issue if it has the same `type` and `subtype` and is within **50 m** (equirectangular approximation), checked with a linear scan of all issues of that type.
  - **Confidence:** sequential noisy-OR, `C_n = 1 − (1 − C_{n−1})(1 − c·w)`, with weights of 1.0 for a new bus, 0.3 for a same-bus repeat within 24 h, and 0.5 for a citizen report. It is capped at 0.97.
  - **Priority (0–100):** severity base from `SEVERITY_SCORES`, plus confidence × 15, a repeat bonus (≤12), a traffic bonus of **0.5 × 8 (a hard-coded placeholder, since there is no traffic signal)**, and an age bonus (≤10).
  - **Severity** is bucketed into `high`/`medium`/`low` from `SEVERITY_SCORES`. Unknown subtypes fall back to a score of 50, which becomes `low`.
- `event_service.py`, `evidence_service.py`, `fleet_service.py`, `citizen_report_service.py`, `analytics_service.py` and `auth_service.py` are thin CRUD, validation and aggregation layers over the models.
- `app/dependencies/auth.py`: JWT decoding, plus the `require_authority` and `require_admin` guards.

**DB migrations:** `alembic/` has 7 linear revisions. **Verified:** `alembic upgrade head` applies cleanly to an empty Postgres 18 database.

**Seeds**
- `app/seed_authority.py` creates `admin@citylens.com` / `admin123` with role admin.
- `seed_demo.py` creates 2 routes, 2 buses (`BUS-014`, `BUS-027`), 2 cameras, 4 road-defect events (two of which fuse into one pothole issue), 2 traffic events, and 2 citizen reports. **Verified:** it produced 6 events and 5 issues.

**Docs:** `API_INTEGRATION.md` is a good, accurate endpoint reference with sample payloads. `.env.example` is present but **broken**; see the bugs below.

### 4.3 Uncommitted work
None on the remote branch. **Note:** the local `backend` branch on this machine is 10 commits behind origin.

### 4.4 Dependencies
`requirements.txt` pins fastapi, uvicorn, sqlalchemy, psycopg2-binary, alembic, pydantic, pydantic-settings, python-dotenv, python-jose, passlib, bcrypt, requests and pytest. **Verified: it installs cleanly on Python 3.12** and covers every third-party import (`fastapi`, `sqlalchemy`, `alembic`, `jose`, `passlib`, `pydantic(_settings)`, `requests`). `python-dotenv` is listed but not imported directly, which is harmless. Nothing is missing.

### 4.5 README
`README.md` is **the same 2-line stub as `main`**. Setup steps (create DB, migrate, seed, run uvicorn) are not written down anywhere; `API_INTEGRATION.md` covers only the endpoints.

### 4.6 Tests (verified)

All 5 test files are **live-HTTP integration tests** against `http://127.0.0.1:8000`. There are no in-process `TestClient` tests, no fixtures, and no DB setup or teardown.

| Scenario | Result | Why |
|---|---|---|
| Fresh clone, `pytest`, no `.env`, no server | **2 collection errors, 0 tests run** | `test_fusion.py` imports `app.models`, and `Settings()` fails because `DATABASE_URL` is missing. `test_event_flow.py` is **a script, not a test**: it makes HTTP calls at import time and gets `ConnectionError`. |
| Server running, DB migrated and seeded | **19 passed, 5 failed** | All 5 failures return **404 on `POST /events`** because the tests hardcode bus, route and camera UUIDs (`fff745f2-…`, `312f8278-…`) from one developer's local DB. Seeding generates new random UUIDs, so these IDs never exist on any other machine. **This is a fixture problem, not a code bug.** |
| Same, with the UUIDs substituted for the seeded ones (scratch copy only) | **24 passed, 0 failed** | This confirms that the fusion math, the persistence of noisy-OR confidence, evidence validation, citizen-report matching and the smoke endpoints all work. |

The 8 pure-math tests in `test_fusion.py` (noisy-OR, cap, severity labels, priority) need no server, but they still can't run without `DATABASE_URL` set, because of the import chain. `test_event_flow.py` contributes 0 tests.

### 4.7 Bugs found by probing the live server (verified)
1. **Following `.env.example` crashes the app at startup.** `cp .env.example .env` raises `ValidationError: jwt_secret_key – Extra inputs are not permitted`, because pydantic-settings forbids extra keys and `JWT_SECRET_KEY` isn't a `Settings` field. If you delete that line, the JWT secret silently falls back to the **hard-coded `"citylens-dev-secret-change-me"`**, because `auth_service` reads `os.getenv`, which `.env` never populates.
2. **Non-UUID IDs return 500 instead of 404/422.** `POST /events` with `"bus_id": "BUS-014"` (the human bus code) returns **500 Internal Server Error**, and `GET /events/not-a-uuid` also returns **500**. Evidence and issues guard against this; events do not.
3. **The timezone of UTC timestamps is silently shifted.** An event posted with `"2026-09-24T10:00:00+00:00"` is stored as `15:30:00`, because the columns are `timestamp without time zone` and Postgres converts to the server's session timezone (IST here). Meanwhile `created_at` is written with naive `datetime.utcnow()`. **In one row, `timestamp` and `created_at` end up 5.5 h apart.** The edge runtime always sends `+00:00` timestamps, so this affects every real event.
4. **`PATCH /issues/{id}/status` accepts any string.** `{"status":"banana"}` returns 200. The backend default is `"unresolved"`, but no allowed set is defined, so it can't agree with the frontend's vocabulary (see §9).
5. **Every event type becomes a persistent Issue.** Traffic-density and pedestrian-hazard events from the edge create Issues with severity `"low"`, a priority around 66, and status `unresolved`, the same as potholes. Transient conditions accumulate forever as open infrastructure issues.
6. **`GET /analytics/congestion` only counts `type == "traffic"`,** but the edge runtime sends `type = "traffic_density"`, so real edge congestion never appears in analytics. Only the seed's fake `"traffic"` events do.
7. `seed_demo.py` crashes at its final summary `print` on Windows consoles with a `UnicodeEncodeError` on `→`. This happens after the data is committed, so it is cosmetic, but it looks like a failure to whoever runs it.
8. Unknown extra fields in an event payload are silently ignored (201). That's fine, but anything the edge adds, such as a plate number, will be dropped without warning.

### 4.8 Hardcoded values
| Where | What | Severity |
|---|---|---|
| `alembic.ini` | `sqlalchemy.url = postgresql://akshaykumar@localhost:5432/citylens_db` (a personal username). `env.py` overrides it from settings, so it is unused but leaked. | Low |
| `app/services/auth_service.py` | JWT secret fallback `"citylens-dev-secret-change-me"` | **High** in combination with bug #1 |
| `app/seed_authority.py`, all tests, `API_INTEGRATION.md` | `admin@citylens.com` / `admin123` | Medium (fine for a demo, must not ship) |
| `tests/*.py` | 6 UUIDs from one developer's DB, plus `API_URL = "http://127.0.0.1:8000"` | Breaks tests everywhere else |
| `app/config.py` | localhost CORS origins default | OK for dev |
| `issue_service.py` | `TRAFFIC_EXPOSURE_PLACEHOLDER = 0.5` (acknowledged in comments) | Design gap |

### 4.9 TODO/FIXME
There are no `TODO`/`FIXME` markers. There is one explicitly documented placeholder, `TRAFFIC_EXPOSURE_PLACEHOLDER`, and a migration comment noting an intentionally skipped schema drift (`uq_event_id`).

### 4.10 Real vs. stubbed
- **Real:** DB schema and migrations, JWT auth, all CRUD endpoints, noisy-OR fusion, priority scoring, citizen-report spatial matching, and basic analytics.
- **Stub or placeholder:** the traffic-exposure term in priority; evidence (paths only, with no upload, storage or serving endpoint); fleet management (seed only, with no bus or route CRUD); a single user role, with no registration and no citizen accounts.

---

## 5. Branch: `m5-edge-runtime` (M5 + M2 logic)

> ⚠️ **This branch has two very different states.** The **committed/pushed** state (2 commits, 20 files) is the base mock pipeline. The **uncommitted working tree on this laptop** adds 15 files and modifies 4, covering all of the M2 traffic and safety logic, the YOLO detector plumbing, and `requirements.txt`. **None of the uncommitted work is visible to anyone else, and it would be lost if this machine's checkout were lost.**

### 5.1 Commit history (pushed)
| Hash | Date | Message |
|---|---|---|
| `067da98` | 2026-09-13 | Build edge AI runtime reliability and tests |
| `225ba2a` | 2026-09-13 | Build edge AI runtime pipeline |

### 5.2 Committed files (20) and what each does
**Pipeline core (`src/`)**. Modules import each other by bare name (`from config import …`), so everything must run with `src/` as the working directory.
- `config.py`: `BUS_ID`, `ROUTE_ID`, `CAMERA_ID` (env, **defaulting to hardcoded UUIDs from a dev DB**), `BACKEND_URL` (default `http://127.0.0.1:8000`), `FRAME_SAMPLE_RATE` (5).
- `video_reader.py`: OpenCV reader that yields every 5th frame with `frame_number` and `timestamp_seconds`. It reads a **file only**; nothing handles camera or RTSP input, though `cv2.VideoCapture` would accept a URL.
- `detectors/base.py`: the `Detection(class_name, confidence, bbox)` dataclass and an abstract `Detector`.
- `detectors/mock_detector.py`: **always returns one `pothole` at 0.90 confidence at a fixed box (35–55% x, 45–65% y) on every frame, regardless of image content.**
- `dedup.py`: suppresses repeat detections if they have the same class, a box centre within 100 px, and appear within 1 s. This is pixel-space only, with no world coordinates.
- `gps_provider.py`: `SimulatedGPS` returns **one fixed point (19.0760, 72.8777)** for every frame, which is the same coordinate as the backend seed's demo pothole.
- `event_formatter.py`: builds the `POST /events` payload.
- `evidence.py`: writes the triggering frame to `evidence/detection_frame_<frame_number>.jpg`. The name is not unique across runs, so each run overwrites the previous one's files.
- `event_queue.py`: a SQLite offline queue (`edge_queue.db`) with `init_queue`, `enqueue_event`, `get_queued_events` and `remove_event`.
- `backend_client.py`: logs in **on every single event** with hardcoded admin credentials, then POSTs the event. Any `RequestException` queues the event. `send_evidence` POSTs the metadata. `flush_queue()` retries queued events.
- `runner.py`: the main loop, which runs video → detect → dedup → save frame → build event → send → send evidence. `VIDEO_PATH = "sample.mp4"` is hardcoded.

**Tests:** `tests/test_dedup.py` (6), `test_event_formatter.py` (1), `test_event_queue.py` (3), `test_video_reader.py` (2).

**Other files:** `.gitignore` and **an empty `README.md` (0 bytes).** There is **no `requirements.txt` in the committed branch.**

### 5.3 Uncommitted work in the local working tree
`git status` / `git diff --stat` on this machine:
```
 M src/config.py                 |  80 +++++-   (all the new thresholds/env settings)
 M src/event_formatter.py        |  78 +++++-   (build_event(), density_to_event(), hazard_to_event())
 M src/runner.py                 | 233 ++++----  (runs 3 detectors/frame, density + hazard monitors)
 M tests/test_event_formatter.py |  81 +++++-
?? WORK_LOG.md, requirements.txt
?? src/anpr.py, src/density.py, src/incident.py, src/pedestrian_safety.py, src/tracker.py
?? src/detectors/{yolo_backend,road_defect_detector,vehicle_detector,pedestrian_detector}.py
?? tests/test_{density,pedestrian_safety,road_defect_detector,vehicle_detector}.py
```
What the uncommitted code actually does:
- `detectors/yolo_backend.py`: a lazy `ultralytics.YOLO` loader with a model cache, which normalises results into `RawBox`. ultralytics is only imported in YOLO mode.
- `detectors/road_defect_detector.py`: maps model labels, including RDD2022 `D00`/`D10`/`D20`/`D40` and generic names, onto 6 subtypes: `pothole`, `damaged_road`, `missing_divider`, `missing_zebra_crossing`, `damaged_signboard` and `waterlogging`. In YOLO mode it loads `models/road_defect_yolov8.pt`, **which does not exist anywhere.** In the default mock mode it returns the always-pothole `MockDetector`.
- `detectors/vehicle_detector.py`: maps COCO `car`, `bus`, `truck`, `motorcycle` and `bicycle` onto 4 classes and provides `count_by_class()`. YOLO mode would use public `yolov8n.pt` (auto-downloaded by ultralytics), **so this is the one detector that could work with real weights today without training.** The mock cycles counts of (2, 5, 9, 13, 13, 4) with synthetic boxes.
- `detectors/pedestrian_detector.py`: maps COCO `person` onto `pedestrian`. The mock walks one synthetic pedestrian across the frame.
- `density.py`: a rolling 10 s average vehicle count, where ≥6 is moderate and ≥12 is heavy. It emits on a level change or every 30 s. **This is a heuristic on counts; there is no density model.**
- `pedestrian_safety.py`: flags a pedestrian inside the central 25–75% × below-45% zone as `crossing_ahead`, 3 or more as `group_crossing`, and a box taller than 45% of the frame as `close_pedestrian`. **This is a geometric heuristic.**
- `tracker.py`: a greedy IOU tracker with no Kalman filter and no re-identification, plus per-track pixel speed and horizontal direction-reversal counts.
- `incident.py`: flags `rash_driving` when pixel speed exceeds 0.35 × the frame diagonal per second or the vehicle reverses direction 3 or more times. It flags `hit_and_run` when a vehicle box's IOU with a pedestrian box is ≥ 0.15. **These are heuristics, and the code's own TODO says so.** They also ignore that the camera itself is moving on a bus, so ego-motion will dominate pixel speeds. **This module is not wired into `runner.py`, has no event formatter, and has no tests.**
- `anpr.py`: crops the lower 45% of the vehicle box, runs EasyOCR (lazily imported), normalises the text, and validates it against an Indian plate regex. `MockPlateReader` returns fabricated plates `MH12AB1001`, `MH12AB1002`, and so on. **It is not wired in and has no tests.**
- `WORK_LOG.md`: an accurate log of the above, including a self-reported 55 passed / 2 failed test run.
- `requirements.txt`: pins opencv-python 5.0.0.93, numpy 2.5.2, requests 2.34.2, ultralytics 8.4.128, torch 2.13.0, torchvision 0.28.0, easyocr 1.7.2 and pytest 9.1.1. **Verified: every pinned version exists on PyPI.** The core deps installed cleanly on Python 3.12; I did not install torch, ultralytics or easyocr because they are multi-GB and only needed for YOLO or OCR modes.

### 5.4 Dependencies vs imports
The working-tree `requirements.txt` covers every third-party import: `cv2`, `numpy`, `requests`, `ultralytics` and `easyocr` (the last two lazily). **The committed branch has no dependency file at all**, so a fresh clone of the pushed branch has no record of what to install.

### 5.5 README
**Empty (0 bytes)** in both the committed and working-tree versions. The only usage notes are in the uncommitted `WORK_LOG.md`.

### 5.6 Tests (verified)
| State | How it was run | Result | Failure reason |
|---|---|---|---|
| Committed | `pytest tests` from repo root | **4 collection errors, 0 run** | `ModuleNotFoundError`: the tests import `dedup`, `config` and so on by bare name, and there is no `conftest.py` or `pytest.ini` to add `src/` to the path. |
| Committed | `cd src && pytest ../tests` | **10 passed, 2 failed** | Both `test_video_reader` tests fail with `ValueError: Could not open video: sample.mp4`. **This is a missing fixture file, not a code bug.** The tests also hardcode `frame_count == 189`, so they need that exact video. |
| Working tree | `pytest tests` from repo root | **8 collection errors** | Same path problem |
| Working tree | `cd src && pytest ../tests` | **55 passed, 2 failed** | The same 2 `sample.mp4` failures. This matches what `WORK_LOG.md` reports. |

**No tests cover `tracker.py`, `incident.py`, `anpr.py`, `backend_client.py` or `runner.py`.**

### 5.7 End-to-end runs against the live backend (verified with a synthetic 60-frame mp4)
| Run | Config | Outcome |
|---|---|---|
| A | Defaults (the hardcoded UUIDs) | **Crash.** The backend returns 404 because the bus doesn't exist. `raise_for_status()` raises `HTTPError`, which is a `RequestException`, so the client treats the 404 as "backend unavailable" and calls `enqueue_event`, which raises `sqlite3.OperationalError: no such table: event_queue` because **`init_queue()` is never called anywhere in `src/`**. |
| B | `BUS_ID`, `ROUTE_ID` and `CAMERA_ID` env vars set to seeded IDs | **Works.** 3 events were sent (1 pothole, 1 pedestrian_hazard/crossing_ahead, 1 traffic_density/moderate) and 3 evidence records were created. The backend stored them and fused them into Issues. Because the simulated GPS equals the seed pothole's location, the mock pothole **fused into the pre-existing demo issue**. |
| C | Backend unreachable (after manually running `init_queue()`) | 3 events were queued in SQLite. **`flush_queue()` is never called anywhere in `src/`**, so they would never be retried, and evidence for queued events is never re-sent even by `flush_queue`. |

### 5.8 Reliability bugs (verified or read directly from the code)
1. `init_queue()` is never called, so the first backend failure of any kind crashes the runner (run A).
2. `flush_queue()` is never called, so the offline queue is write-only.
3. 4xx responses (404 unknown bus, 422 bad payload) are treated as "offline" and queued. Once flushing is wired up, a single bad event would block the queue forever, because `flush_queue` stops at the first failure.
4. `send_evidence` has no error handling, so an evidence POST failure after a successful event crashes the whole run.
5. The client logs in again for every event and every evidence record (two logins per detection).
6. Evidence `frame_path` sent to the backend is the **edge-local Windows path** (`evidence\detection_frame_0.jpg`). The image itself never leaves the bus.
7. Event timestamps are `wall-clock at runner start + video offset`, not the time the footage was recorded. For "recorded video" this puts every event at *now*.
8. Evidence filenames collide across runs, and across the three event types on the same frame.

### 5.9 Hardcoded values
| Where | What |
|---|---|
| `backend_client.py` | `EMAIL = "admin@citylens.com"`, `PASSWORD = "admin123"` (the edge device logs in as the platform admin) |
| `config.py` | Default `BUS_ID`, `ROUTE_ID` and `CAMERA_ID` UUIDs that only exist in one developer's DB; `BACKEND_URL = http://127.0.0.1:8000` |
| `runner.py` | `VIDEO_PATH = "sample.mp4"` (not configurable via env or CLI) |
| `gps_provider.py` | Fixed GPS point 19.0760, 72.8777 |
| `anpr.py` | The mock emits fabricated plate numbers; this must never reach an enforcement UI unlabelled |

### 5.10 TODO/FIXME in code
- `detectors/road_defect_detector.py`: "TODO: train / obtain the fine-tuned road-defect weights… No public YOLO checkpoint covers all six defect classes."
- `detectors/pedestrian_detector.py`: "TODO: telling school children from adults needs fine-tuned weights."
- `incident.py`: "TODO: these are heuristics, not a trained incident model. Speed is measured in image space… should replace this before the numbers are trusted for enforcement."
- `WORK_LOG.md` §5 open items also lists: wire tracker, incident and ANPR into the runner; add a `sample.mp4` fixture; move credentials to env; fill in the README; and commit the work.

---

## 6. Branch: `new-frontend` (M3)

### 6.1 Commit history
| Hash | Date | Message |
|---|---|---|
| `1ea1e11` | 2026-09-24 | Traffic: Mumbai-wide day/hour congestion heatmap |
| `0756cde` | 2026-09-24 | Redesign Fleet Drishti frontend with new design system (113 files, +6217/−3634) |
| `6a2eb87` | 2026-09-24 | Backup unfinished UI before redesign (this is the `old-ui` head) |

### 6.2 Files (153), grouped
- **Tooling:** Vite 8, React 19, TypeScript 6, Tailwind 4, MapLibre GL 6, react-router 7 and oxlint (`package.json`, `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`).
- **Design system:** `design-system/fleet-drishti/MASTER.md` is a substantive design spec with principles such as "say where the data came from" and "never imply live data that isn't live", plus layout rules.
- **Pages** (`src/pages/*`, 16 routes): Command Center (`/`), Live Map, Fleet and Bus Detail, Road Issues and Issue Intelligence (`/road-issues/:issueId`), Traffic (the largest page, with a day/hour congestion heatmap), Safety, Infrastructure, Routes and Route Detail, Analytics, Priority Queue, Cameras, Live AI, Architecture and NotFound.
- **Components:** GIS (`GISMap.tsx` on MapLibre with OpenFreeMap/OSM tiles, 6 layers, and `MapDrawer`), AI (`DetectionPlayer` draws bounding boxes over a frame), events, telemetry and KPI tiles, traffic panels, and UI primitives.
- **Services** (`src/services/*`): the intended API boundary. **Every method returns `mockAsync(<fixture>)`, a Promise with a 120 ms `setTimeout`.** There is no `fetch`, no axios, no API base URL and no `import.meta.env` anywhere in `src/`.
- **Data:**
  - `src/data/mock/*`: hand-written fixtures (7 buses, 9 cameras, 10 detections, 8 events, 3 issues, 6 safety events, 4 traffic hotspots, 4 infrastructure items). Bus positions are explicitly labelled `SIMULATED`.
  - `src/data/gtfs/*`: **real** BEST routes and stops from the community Mumbai GTFS feed (croyla/mumbai-gtfs, MIT-0), ingested by `scripts/ingest-gtfs.mjs`.
  - `src/data/traffic/mumbaiRoads.json`: **real** OSM road geometry (5,467 ways) from `scripts/fetch-corridor-roads.mjs`.
  - `src/lib/trafficProfiles.ts`: the congestion values painted onto those real roads are a **"Deterministic DEMO traffic model"**, i.e. synthetic.
  - `src/data/clips/recordedClips.ts`: **an empty array.** Its comment explains how to attach real footage plus model output; none is attached, so every clip in the Live AI player is a DEMO clip drawn from mock detections.
- **Types** (`src/types/*`): the frontend's own domain model (see §9 for how it differs from the backend).

### 6.3 Uncommitted work
None (clean worktree of the remote branch).

### 6.4 Dependencies
`package.json` and `package-lock.json` are consistent: `npm ci` installed 76 packages cleanly. Nothing is missing.

### 6.5 README
**The unmodified Vite template README** ("React + TypeScript + Vite… This template provides…"). It has no project-specific content.

### 6.6 Build, lint and tests (verified)
- `npm run build` (`tsc -b && vite build`): **succeeds.** The single bundle is 1.51 MB (423 kB gzipped), with a chunk-size warning.
- `npm run lint`: **2 warnings, 0 errors.** One is a false positive in `useAsyncData` (deps are passed via a parameter); the other is an unused variable in `scripts/ingest-gtfs.mjs`.
- **Tests: none.** There is no `test` script and no test framework installed.

### 6.7 Hardcoded values
Public tile URLs (`tiles.openfreemap.org`, `tile.openstreetmap.org`) and Google Fonts. These are fine for a demo, though `tile.openstreetmap.org` has a usage policy that prohibits heavy or production use. There are no credentials and no localhost URLs, because nothing calls a backend.

### 6.8 TODO/FIXME
None in code.

### 6.9 Real vs. mock
- **Real:** the UI, layouts, map rendering, BEST route and stop geometry, and OSM road geometry.
- **Mock or synthetic:** every event, issue, detection, bus position, camera, safety event, KPI and analytics number, and the congestion values. The UI does label much of this with `DEMO`/`SIMULATED` source badges, which is good and consistent with MASTER.md.
- **Missing entirely:** a login/auth screen, a citizen-reporting screen, and a landing page (`/` is the Command Center dashboard).

---

## 7. Branch: `old-ui` (M3, superseded backup)

| Hash | Date | Message |
|---|---|---|
| `6a2eb87` | 2026-09-24 | Backup unfinished UI before redesign |

- 145 files with the same stack and the same mock service-layer pattern. `new-frontend` is built directly on top of this commit; the diff between them is 115 files changed, +7149/−3632.
- It has components that `new-frontend` dropped or reworked (`EdgePipelinePanel`, `EvidencePanel`, `CorrelationPanel`, `PedestrianRiskCard`, `VehicleIncidentPanel`, and others) and a `PlaceholderPage` used by the Architecture page.
- **Verified:** it builds successfully and lint shows about 6 warnings (ref access during render in `GISMap.tsx`). It has no tests and no backend calls, and its README is the Vite template.
- **Status:** a snapshot kept as a backup. Treat `new-frontend` as the live M3 branch. `old-ui` can be deleted once nothing needs to be salvaged from it.

---

## 8. Cross-check against team roles (M1–M6)

Legend: ✅ done · 🟡 partial / works only with mock or caveats · ❌ not started / absent

### M1 — Road-defect ML/YOLO
| Deliverable | Status | Evidence |
|---|---|---|
| Dataset | ❌ | No images, labels, `data.yaml` or dataset scripts in any branch or on disk (searched every branch's tree and `D:\SIH_Final`). |
| Training | ❌ | No training script, notebook or config anywhere. |
| `best.pt` weights | ❌ | No `.pt`/`.onnx` files in any branch. The edge expects `models/road_defect_yolov8.pt`, which does not exist. |
| `classes.txt` | ❌ | Absent. The **de facto class list** currently lives in M5's uncommitted `road_defect_detector.py` (`pothole`, `damaged_road`, `missing_divider`, `missing_zebra_crossing`, `damaged_signboard`, `waterlogging`), and it **disagrees with the backend's names** (see §9). |
| **Overall** | **❌ Not started (no commits by an M1 owner in the repo)** | Every pothole in every demo comes from `MockDetector`. |

### M2 — Traffic + safety ML/YOLO
All of this exists only as **uncommitted** code on the M5 branch.
| Deliverable | Status | Specifics |
|---|---|---|
| Vehicle detection/classification | 🟡 | `vehicle_detector.py` uses COCO `yolov8n.pt`, so it is plausible without training. **Never run with real weights** (ultralytics isn't installed and there are no tests against a real model). Only the mock was exercised. |
| Vehicle counting | 🟡 | `count_by_class()` exists, but counts are not sent to the backend (only the congestion level is). |
| Density estimation | 🟡 | `density.py` is a **rolling-count threshold heuristic** (≥6 moderate, ≥12 heavy), with no model. It is wired into the runner and has tests. |
| Pedestrian safety-zone logic | 🟡 | `pedestrian_safety.py` is a **fixed-geometry heuristic**. It is wired in and tested. School-child detection is not done (TODO). |
| Vehicle tracking | 🟡 | `tracker.py` is a greedy IOU tracker. **Not wired into the runner and untested.** |
| Incident detection (rash driving, hit-and-run) | 🟡 (heuristic, unwired) | `incident.py` uses pixel-speed, weaving and IOU heuristics that don't compensate for bus ego-motion. **Not wired, untested, and there is no event type for it.** |
| ANPR | 🟡 (unwired) | `anpr.py` wraps EasyOCR with an Indian plate regex. It has never been run on a real plate. The mock fabricates plates. **Not wired and untested.** |
| **Overall** | **🟡 Scaffolding and heuristics only; no trained model; about half unwired; all uncommitted** | No commits by an M2 owner. This code appears to have been written as part of the M5 work. |

### M3 — Frontend + GIS
| Deliverable | Status | Specifics |
|---|---|---|
| Landing page | ❌ | `/` is the operator dashboard. There is no public landing page. |
| Auth UI | ❌ | No login screen, token handling or route guards. The backend requires a JWT on every GET. |
| Fleet View | 🟡 | `Fleet` and `BusDetail` pages exist with mock buses and `SIMULATED` positions. |
| Urban Intelligence Map | 🟡 | `LiveMap` and `GISMap` on MapLibre with **real** BEST GTFS routes and stops and OSM roads. **All markers come from mock data.** |
| Issue Intelligence panel | 🟡 | `/road-issues/:issueId` exists and renders mock `Issue`s. |
| Citizen Reporting UI | ❌ | Not present, although the backend endpoint exists and is public. |
| Analytics UI | 🟡 | The `Analytics` page renders mock numbers. It does not call `/analytics`. |
| Backend integration | ❌ | **Zero HTTP calls.** The service layer is shaped for a swap-in, but the types don't match the backend (§9). |
| **Overall** | **🟡 Visually far along; functionally disconnected** | The build is green, but there are no tests. |

### M4 — Backend + database
| Deliverable | Status | Specifics |
|---|---|---|
| DB models and migrations | ✅ | 8 tables and 7 migrations, verified on a fresh Postgres. |
| Event API | ✅ | Works; bugs #2 and #3 (500 on bad IDs, timezone shift) apply. |
| Fleet API | 🟡 | Read-only. Buses and routes can only come from `seed_demo.py`. |
| Issue API and fusion | ✅ | Noisy-OR fusion verified end to end. It lacks status validation, and it turns transient event types into Issues. |
| Citizen API | ✅ | Works and fuses into issues. It is unauthenticated with no rate limiting, and has no photo upload (path strings only). |
| Analytics API | 🟡 | Basic counts only. Congestion filters on `type == "traffic"`, which the edge never sends. |
| Auth | 🟡 | Login plus JWT roles work. The `.env.example` crash and the insecure default secret remain, and there is no user management. |
| Evidence handling | 🟡 | A metadata table plus validation. **No file upload, storage or serving**, so evidence images are not viewable from the backend. |
| **Overall** | **✅ Most complete piece; a handful of real bugs (§4.7)** | 24/24 tests pass with correct fixtures, but the suite only runs against a live server with manually matching UUIDs. |

### M5 — Edge AI / video pipeline
| Deliverable | Status | Specifics |
|---|---|---|
| Video ingestion | 🟡 | File-based OpenCV reader. The path is hardcoded, there is no live camera or RTSP support, and no sample video is in the repo. |
| AI model integration | 🟡 | The YOLO plumbing (`yolo_backend.py` plus 3 detectors) exists, **uncommitted**. It defaults to mocks, and no road-defect weights exist. |
| Tracking | 🟡 | `tracker.py` exists but is not wired or tested (uncommitted). |
| Event generation | ✅ | 3 event types, verified accepted by the backend (201). |
| Dedup | ✅ | Pixel-space dedup with 6 tests. |
| Evidence | 🟡 | Saves a local JPG and posts its **local path** only. The image never reaches the backend. |
| Local offline queue | 🟡 → effectively ❌ | The SQLite queue exists but `init_queue` and `flush_queue` are never called. **It crashes on first failure (verified).** |
| Backend integration | 🟡 | Works when `BUS_ID`, `ROUTE_ID` and `CAMERA_ID` env vars are set correctly (verified). The defaults crash, the client logs in as admin with hardcoded credentials, and it re-authenticates per call. |
| **Overall** | **🟡 Mock pipeline works end to end; reliability layer broken; majority uncommitted** | 55/57 tests pass (2 need `sample.mp4`), and only when run from `src/`. |

### M6 — Testing, dataset organisation, demo data, documentation
| Deliverable | Status | Specifics |
|---|---|---|
| Testing | 🟡 | Backend: 24 live-server integration tests with non-portable UUID fixtures, and 1 "test" file that is actually a script. Edge: 57 unit tests, which need `cd src` and a missing `sample.mp4`. Frontend: **0 tests.** **No CI** in any branch, and no cross-component contract test. |
| Dataset organisation | ❌ | Nothing exists to organise. |
| Demo data | 🟡 | Backend `seed_demo.py` (2 buses, 6 events, 2 citizen reports). Frontend has its own unrelated fixtures (`BUS-101`… vs the backend's `BUS-014`/`BUS-027`, and different subtypes and statuses), so the two demos can't be shown as one story. No demo video. |
| Documentation | 🟡 | `API_INTEGRATION.md` is good. `MASTER.md` is a good design spec. `WORK_LOG.md` is good but **uncommitted**. **Every README is empty or a template.** `context.md` is a placeholder. There are no setup or run instructions for any component. |
| **Overall** | **🟡 / mostly ❌ (no commits by an M6 owner in the repo)** | |

---

## 9. Integration check (payload/schema mismatches)

I compared the actual code on each branch: the edge's `build_event()` (working tree) against the backend's `EventCreate`, `SEVERITY_SCORES` and analytics, and the frontend's `src/types/*` and `lib/taxonomy.ts`.

### 9.1 Edge → Backend `POST /events`
**Shape: matches.** The edge sends exactly `{type, subtype, confidence, timestamp, gps:{lat,lng}, bus_id, route_id, camera_id}`, and the backend's `EventCreate` accepts exactly that. Verified: HTTP 201 for all three event types.

**Values and semantics: several mismatches**

| # | Field | Edge sends | Backend expects / does | Effect (verified where noted) |
|---|---|---|---|---|
| 1 | `subtype` (road) | `damaged_road` | `SEVERITY_SCORES` key `road_damage` | Scored as unknown (50), giving severity `low` instead of `high` (80) |
| 2 | `subtype` (road) | `missing_divider` | `damaged_divider` | Same fallback to low severity and wrong priority |
| 3 | `subtype` (road) | `damaged_signboard` | `damaged_traffic_sign` | Same |
| 4 | `subtype` (road) | — | `other_hazard` has a score; the edge never emits it | Unused |
| 5 | `type` (traffic) | `traffic_density` (subtypes `moderate`/`heavy`) | Analytics counts `type == "traffic"`; the seed uses `traffic`/`traffic_congestion` | Real edge congestion **never appears in `/analytics/congestion`** |
| 6 | `type` (safety) | `pedestrian_hazard` | No special handling | **Becomes a persistent Issue** (verified: severity low, priority 66.75, `unresolved`) |
| 7 | `type` (traffic) | `traffic_density` | No special handling | **Becomes a persistent Issue** (verified: priority 66) |
| 8 | `timestamp` | Timezone-aware ISO string, `…+00:00` | `timestamp without time zone`, converted to the DB session timezone | **Shifted by the server's UTC offset** (verified: 10:00Z stored as 15:30). `created_at` stays UTC, so the two disagree by 5.5 h |
| 9 | `bus_id` | Defaults to a UUID from someone's DB | Must be the DB UUID of an existing bus | 404, then the edge queue crash (verified). Passing a bus *code* like `BUS-014` returns **500** (verified) |
| 10 | auth | Logs in as `admin@citylens.com` | `POST /events` requires role admin or authority | Works, but the edge holds admin credentials. There is no device or service identity |
| 11 | incident fields | `incident.py` produces `plate_number`, `plate_confidence`, `track_id` and `speed_ratio` | `EventCreate` has no such fields; extras are silently dropped | **No path exists for ANPR or incident data to reach the backend** |
| 12 | density detail | `counts_by_class`, `average_count` | No field | Vehicle counts are lost; only the level is sent |

### 9.2 Edge → Backend `POST /evidence`
**Shape matches** (verified 201). **Semantics mismatch:** the edge sends `frame_path = "evidence\\detection_frame_0.jpg"`, a path on the bus's disk. The backend stores the string. Neither side transfers the image, so there is **no way for anyone off the bus to view the evidence.** `video_path` is never sent.

### 9.3 Backend → Frontend (the frontend doesn't call the backend, but its types show what it *expects*)
| Concept | Backend (`EventOut` / `IssueOut`) | Frontend (`types/event.ts`, `types/issue.ts`) | Mismatch |
|---|---|---|---|
| ID | `id` | `eventId`, `issueId` | Name |
| Case | snake_case | camelCase | Everywhere |
| Coordinates | `lat`, `lng` | `latitude`, `longitude` | Name |
| Event type values | `road_defect`, `traffic_density`, `pedestrian_hazard` | `road-defect`, `traffic`, `safety`, `infrastructure`, `environmental` | **Vocabulary**: hyphen vs underscore, and different sets |
| Subtypes | `pothole`, `damaged_road`, `missing_divider`, … (edge); `road_damage`, `damaged_divider`, … (backend) | `pothole`, `road-damage`, `missing-divider`, `faded-crossing`, `damaged-signboard`, `congestion`, `crossing-risk`, … | **A third, different vocabulary.** `lib/taxonomy.ts` maps unknown subtypes to "Other", so real backend data would mostly be bucketed as "Other Road Hazard" |
| Severity | `high`, `medium`, `low` (Issue only; Events have none) | `critical`, `high`, `medium`, `low`, required on both Event and Issue | The backend never produces `critical`, and the frontend's Priority Queue filters on `critical`/`high` |
| Issue status | Default `unresolved`; anything accepted; tests use `in_progress` | `new`, `under-review`, `action-required`, `resolved` | **No overlap except `resolved`** |
| Issue extras | `priority`, `confidence` | `observationCount`, `observingBuses[]`, `relatedEventIds[]`, `evidence[]`, `location` (a text address) | The frontend needs aggregates and joins the backend doesn't return, and it has **no `priority` field** (it recomputes its own in `lib/priorityScore.ts`) |
| Event extras | — | `location`, `landmark`, `evidenceUrl`, `metadata`, `detectionId` | Not provided by the backend; there is no reverse geocoding |
| Bus identity | UUID `id` plus `bus_code` (`BUS-014`) | `busId` in the form `BUS-101` | The frontend uses codes as IDs |
| Auth | JWT required on every GET | No auth at all | The frontend would get 403 on every call |

**Bottom line:** there are **three separate taxonomies** (edge, backend and frontend) and **no shared contract file.** `API_INTEGRATION.md` documents the backend side only.

---

## 10. Vertical slice trace

**Target:** recorded video → pothole detection → edge pipeline → event → GPS/timestamp → backend → database → GIS map → pin on map

| # | Step | Works today? | Detail |
|---|---|---|---|
| 1 | Recorded video | 🟡 | **No video exists in the repo**, and the path is hardcoded to `sample.mp4` in the current directory. With any mp4 placed there it works; I verified this with a synthetic clip. |
| 2 | Pothole detection | ❌ **Breaks here (for real detection)** | No road-defect weights exist anywhere. The default `MockDetector` emits a pothole at a fixed box on **every** frame regardless of content, so a blank video "detects" potholes. `DETECTOR_MODE=yolo` would fail because `models/road_defect_yolov8.pt` is missing and ultralytics isn't installed. |
| 3 | Edge pipeline (dedup, evidence save) | ✅ (mock) | Verified: dedup suppresses repeats, and the frame is saved to `evidence/`. Requires running from `src/` and **the uncommitted working tree** for the multi-detector runner. |
| 4 | Event | ✅ | The payload shape matches `POST /events`, verified 201. |
| 5 | GPS / timestamp | 🟡 | GPS is **one fixed simulated point**, so every detection lands in the same spot and fuses into one issue. The timestamp is wall-clock time at runtime, not the recording time. The backend then **shifts** it by the server's UTC offset. |
| 6 | Backend | 🟡 | Works **only if** the `BUS_ID`, `ROUTE_ID` and `CAMERA_ID` env vars are set to UUIDs that exist in that backend's DB, and the backend is seeded with the admin account. **With default config the edge crashes** (unknown bus → 404 → uninitialised queue → `sqlite3.OperationalError`). A backend set up by following `.env.example` **won't start** at all. |
| 7 | Database | ✅ | Event stored, Issue created or fused, evidence metadata stored (all verified in Postgres). The evidence image itself is not stored. |
| 8 | GIS map | ❌ **Breaks here** | The frontend makes no HTTP calls, has no API base URL, no login (required for `GET /events`/`/issues`), and a field model that doesn't match (`lat`/`lng` vs `latitude`/`longitude`, different type and status vocabularies). |
| 9 | Pin on map | ❌ | The map renders pins from `src/data/mock/*` only. A pothole posted by the edge will never appear. |

**What you can demo today:** Steps 1 and 3–7 run for real with a mock detector and fixed GPS, and you can see the resulting events and issues via Swagger at `/docs` or `GET /issues`. Separately, the frontend can be demoed with its own mock data. **The two halves are not connected, and there is no real detection in either.**

**Minimum to close the slice (in dependency order):**
1. Commit and push the M5 working tree.
2. Fix the edge queue (`init_queue` at startup, treat 4xx as a permanent failure).
3. Fix `.env.example`/`JWT_SECRET_KEY` so the backend starts from the documented setup.
4. Agree one subtype, type, status and severity vocabulary across edge, backend and frontend.
5. Store timestamps as `timestamptz`.
6. Add a login plus a typed `fetch` client in the frontend and map `EventOut`/`IssueOut` onto the map markers.
7. Get *any* pothole-capable weights (e.g. a public RDD2022 or pothole YOLO checkpoint) to replace the mock.
8. Replace fixed GPS with a per-frame GPS track, e.g. a GPX/CSV file alongside the recorded video.

---

## 11. Open items, ranked by what they block

| Rank | Item | Owner | Blocks | Effort guess |
|---|---|---|---|---|
| 1 | **No road-defect model: no dataset, training, `best.pt` or `classes.txt`.** | M1 | The headline feature; every demo is currently a mock; M5's YOLO path can't be exercised; M6 dataset work | Large. Fastest path is a public pothole/RDD2022 checkpoint as a stopgap while training |
| 2 | **Frontend is not connected to the backend** (no API client, no auth UI, types and vocabularies mismatch). | M3 (+M4) | The map-pin step of the vertical slice, every "live" screen, and the citizen-reporting and auth deliverables | Medium |
| 3 | **No shared data contract.** Three different taxonomies for type, subtype, status and severity, and a timezone bug on timestamps. | M4 lead, with M1/M2/M3/M5 | Correct severity and priority, analytics, frontend filtering, and every integration after this | Small to agree, then small edits in all three codebases. **Do this before more UI or ML work bakes in names.** |
| 4 | **About 60% of M5/M2 code is uncommitted on one laptop** (15 new and 4 modified files, including `requirements.txt` and `WORK_LOG.md`). | M5 | Anyone else running or reviewing the edge; risk of total loss | Minutes |
| 5 | **Edge reliability bugs:** `init_queue` never called (crash, verified), `flush_queue` never called, 4xx treated as offline (poison queue), `send_evidence` unguarded, per-event admin login, hardcoded admin credentials and dev UUIDs. | M5 | Any real run beyond a happy-path demo; the offline requirement | Small |
| 6 | **Backend startup and config bugs:** `.env.example` crashes the app; the JWT secret silently defaults to a public string; `alembic.ini` leaks a personal DB username. | M4 | Every new person setting up the backend; security | Small |
| 7 | **Evidence is metadata-only:** no upload, storage or serving, and the edge sends bus-local paths. | M4 + M5 | Issue Intelligence evidence view, citizen photo reports, and the "verify before action" workflow | Medium |
| 8 | **Backend correctness bugs:** 500 on non-UUID IDs; status accepts any string; transient traffic and pedestrian events become permanent Issues; analytics congestion filters on the wrong type. | M4 | Clean demo data and trustworthy dashboards | Small to medium |
| 9 | **GPS is a fixed point and timestamps are wall-clock.** | M5 | Meaningful map placement and fusion (everything currently fuses into one issue) | Small (a GPX/CSV-driven GPS provider) |
| 10 | **Test infrastructure is not portable.** Backend tests need a live server and one developer's UUIDs, and `test_event_flow.py` is a script; edge tests need `cd src` and a missing `sample.mp4` with exactly 189 frames; the frontend has 0 tests; there is no CI and no contract test. | M6 | Confidence in every change; catching regressions like #3 and #5 above | Medium: add `conftest.py`/`pytest.ini` for the edge, a `TestClient` plus a fixture DB for the backend, and a small sample video |
| 11 | **M2 incident, tracking and ANPR are unwired, untested heuristics** that ignore the bus's own motion, and there is no event type or backend field for plates or incidents. | M2 (+M4 schema) | The incident and ANPR deliverables and the Safety page's "Rash Driving"/"Hit-and-Run" categories | Medium to large |
| 12 | **Docs are empty:** every README is blank or the Vite template, `context.md` is a placeholder, and there are no run instructions for any component. | M6 | Onboarding and judges or reviewers running the project | Small |
| 13 | **Branch hygiene:** `main` is empty; 3 of 6 branches are orphans with no shared history; local `backend` is 10 behind; the local-only `edge` branch is a stale, misnamed copy of `backend`; `old-ui` is a redundant backup. | Whole team | Producing a single integrated build | Small, but needs an agreed repo layout (e.g. `/backend`, `/edge`, `/frontend` under `main`) |
| 14 | Minor: `seed_demo.py` Windows encoding crash; evidence filename collisions; frontend 1.5 MB single bundle; OSM tile-server usage policy. | various | Polish | Trivial |

---

*Generated by inspecting each branch in an isolated worktree on 2026-09-24. Test and integration results come from real runs against a throwaway PostgreSQL 18 instance and the actual FastAPI server. No code in the repository was modified, and nothing was committed or pushed.*
