# Fleet-Drishti / CityLens — Repository Status Update

**Repo:** github.com/s44nvi/Fleet-Drishti
**Report date:** 2026-09-24 (second report of the day; it replaces the earlier 2026-09-24 version)
**Method:** I ran `git fetch origin --prune`, then checked out every remote branch, the local-only `edge` branch, and the local unpushed M5 commit into separate temporary detached `git worktree`s. The live `m5-edge-runtime` checkout and its uncommitted files were only read, never touched. For each branch I read the code, installed its dependencies in isolated venvs (Python 3.12.6) or `node_modules` (Node 22.16, npm 11), and ran its tests and build.

For the backend I started a **throwaway PostgreSQL 18.2 cluster** on port 55432 (server timezone `Asia/Calcutta`), applied all Alembic migrations, seeded it, started the API, and drove it from its own test suite, a probe script, and the real edge runner. For the edge I generated **synthetic mp4 clips**. I ran the motion gate over them on its own and ran the full `runner.py` pipeline against the live backend.

Every claim marked *verified* was observed in those runs. Anything that is an estimate or was not re-run says so. Nothing was committed or pushed, and all temporary worktrees, databases and servers were removed afterwards. The only file this report changes in the repo is `STATUS_UPDATE.md` itself.

> **One-paragraph summary.** The backend (M4) is still the most complete piece and is **unchanged since the last report**: same commit, same passing tests (24/24 with correct fixtures), and the same bugs, all re-verified. The M2/YOLO/density/hazard work that was uncommitted last time is now **committed as `7006109`, but only locally**. `origin/m5-edge-runtime` is still at `067da98`, so ~2,900 lines of edge code still exist on one laptop only. On top of that there is a new **uncommitted motion-gating layer**. Its 12 unit tests pass, and I verified its frame-skip counters on real runs. On synthetic clips it skipped **83% of frames on a static scene, 55% with nearby traffic, and 0% when driving past a textured street**. However, the full pipeline runs exposed a **regression the unit tests don't catch**: at **29.97 fps with default settings, the gate turns one static pothole into ~1 event per second** (20 events vs 1 without the gate), because its 1 s safety-net interval lands just past the dedup window. It also falls back to its once-per-second floor on low-texture footage even while moving. **Still true:** there is no trained model anywhere in the repo, every detection comes from a mock, and the frontend (M3) is a polished but 100% mock-data UI with no backend calls. The "video → pin on map" slice still breaks at real detection and at backend → map.

---

## 0. Changes since the last report (earlier 2026-09-24 version)

| # | What moved | Status now | Verified how |
|---|---|---|---|
| 1 | **M2/YOLO/density/hazard work committed** as `7006109` "Add M2 traffic/safety logic, YOLO detector plumbing, and density/hazard monitors" (2026-09-24 20:47 +0530, author Hdawgg): 20 files, +2,941/−83. It contains exactly the 15 files listed as untracked and the 4 listed as modified last time, **plus `STATUS_UPDATE.md` itself**. | **Committed but NOT pushed.** `m5-edge-runtime` is "ahead 1" of `origin/m5-edge-runtime`, which is still `067da98`. It is in git history now (safer against accidental edits), but **nobody else can see it**, and losing this machine still loses it. | `git log`, `git show --stat 7006109`, `git branch -vv` |
| 2 | **New motion gate (uncommitted):** `src/motion_gate.py` (new, `MotionGate.should_process()`), 4 `MOTION_*` settings in `src/config.py`, wiring and `PipelineStats.frames_sampled/processed/skipped` in `src/runner.py`, `tests/test_motion_gate.py` (12 tests), and `README.md` content. | **Uncommitted and at risk.** 12/12 unit tests pass, and the skip counters are verified correct. There is a **verified duplicate-event regression** (§5.7) and a **low-texture blind spot** (§5.6). It has never been run on real camera footage. | `git status`, pytest, synthetic-clip runs, 29.97 fps pipeline run |
| 3 | **README on `m5-edge-runtime`** now documents the motion gate. | **Only in the working tree.** The committed `README.md` in `7006109` is still **0 bytes**. | `git cat-file -s 7006109:README.md` → 0 |
| 4 | Edge test count: 57 → **69** (working tree). | 67 pass and 2 fail (the same 2 `sample.mp4` failures). The committed `7006109` is 55 pass, 2 fail. | pytest at 3 states (§5.5) |
| 5 | Local `backend` branch **fast-forwarded to `origin/backend`** (reflog: 2026-09-24 20:47:38). | Local `backend` is now even with origin. The "10 commits behind" hygiene item is resolved. | `git reflog show backend` |
| 6 | **Remote branches:** no new commits on any remote branch, no new branches, none deleted. | `main`, `backend`, `proj_context`, `new-frontend`, `old-ui` and `origin/m5-edge-runtime` heads are identical to the last report. | `git fetch --prune`, `git branch -a -vv` |
| 7 | **Backend bugs from the last report:** all re-verified except the `seed_demo.py` Windows-console crash, which **did not reproduce** in this run (output was piped, not a console; not re-tested interactively). | Unchanged | Live probe (§4.7) |
| 8 | New finding: `.gitignore` on `m5-edge-runtime` contains `*.mp4`, which explains why the `sample.mp4` the video tests need was never committed. | — | `git show 7006109:.gitignore` |
| 9 | `WORK_LOG.md` was committed in `7006109` but is **stale**: it still calls its §3 work "uncommitted", lists "Commit the uncommitted work" as open, and does not mention the motion gate. | Docs drift | Read the file |
| 10 | The earlier motion-gate design estimates ("~83% static, 40–70% in traffic, 0–5% moving", and "raise max-gap to 2.0 s for ~92%") were untested. They are **replaced by measured numbers in §5.6.** The "raise to 2.0 s" advice is **wrong**, because it triggers the duplicate-event bug (§5.7). | Superseded | Runs in §5.6–5.7 |

---

## Table of contents
0. [Changes since the last report](#0-changes-since-the-last-report-earlier-2026-09-24-version)
1. [Branch inventory](#1-branch-inventory)
2. [Branch: `main`](#2-branch-main)
3. [Branch: `proj_context`](#3-branch-proj_context)
4. [Branch: `backend` (M4)](#4-branch-backend-m4)
5. [Branch: `m5-edge-runtime` (M5, plus M2 logic)](#5-branch-m5-edge-runtime-m5-plus-m2-logic)
6. [Branch: `new-frontend` (M3)](#6-branch-new-frontend-m3)
7. [Branch: `old-ui` (M3, superseded backup)](#7-branch-old-ui-m3-superseded-backup)
8. [Cross-check against team roles (M1–M6)](#8-cross-check-against-team-roles-m1m6)
9. [Integration check (payload/schema mismatches)](#9-integration-check-payloadschema-mismatches)
10. [Vertical slice trace](#10-vertical-slice-trace)
11. [Open items, ranked by what they block](#11-open-items-ranked-by-what-they-block)

---

## 1. Branch inventory

| Branch | On remote? | Head | Last commit | Commits | Shares history with `main`? | Author(s) |
|---|---|---|---|---|---|---|
| `main` | yes | `ee15c36` | 2026-09-12 | 1 | — | saanvi |
| `backend` | yes | `80dfa32` | 2026-09-23 | 24 (incl. `main`'s 1) | yes, forked from `ee15c36` | HaleHenry-rig |
| `m5-edge-runtime` (remote) | yes | `067da98` | 2026-09-13 | 2 | **no, orphan branch** | HaleHenry-rig |
| `m5-edge-runtime` (local) | **local commit not pushed** | `7006109` | 2026-09-24 | 3 (1 ahead of origin) **+ uncommitted working tree** | no | HaleHenry-rig, Hdawgg |
| `proj_context` | yes | `b7a3cf4` | 2026-09-12 | 2 (incl. `main`'s 1) | yes | Hdawgg |
| `new-frontend` | yes | `1ea1e11` | 2026-09-24 | 3 | **no, orphan branch** | saanvi |
| `old-ui` | yes | `6a2eb87` | 2026-09-24 | 1 | **no, orphan branch** | saanvi |
| `edge` | **local only** | `47a7065` | 2026-09-13 | — | yes | A stale copy of `backend` as of 2026-09-13. It contains **no edge code** despite the name. Unchanged. |

Branch-hygiene notes:
- **The most important risk is not a branch but a push.** `7006109` plus the uncommitted motion gate hold all M2 logic, the YOLO plumbing, `requirements.txt`, the motion gate and the only edge README content. None of it is on GitHub.
- Local `backend` now matches `origin/backend` (it was 10 behind last time).
- `m5-edge-runtime`, `new-frontend` and `old-ui` still have **no common ancestor with `main`**. Merging them will need `--allow-unrelated-histories` or a rebase. `main` is still just the initial README, and nothing has been merged into it.
- `backend` (top-level `app/`) and `m5-edge-runtime` (top-level `src/`) would not collide on code paths if merged, but both have a root `README.md` and `.gitignore`. Now that `m5-edge-runtime` also tracks `STATUS_UPDATE.md` and `WORK_LOG.md` at the root, a shared tree needs a layout decision (e.g. `/backend`, `/edge`, `/frontend`, `/docs`).

---

## 2. Branch: `main`

| Hash | Date | Message |
|---|---|---|
| `ee15c36` | 2026-09-12 | Initial commit |

- **Files:** `README.md` only, with the title and the tagline "AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet".
- No code, tests, dependencies or uncommitted work (clean worktree).
- **Status: empty placeholder.** There is still no integration branch.

---

## 3. Branch: `proj_context`

| Hash | Date | Message |
|---|---|---|
| `b7a3cf4` | 2026-09-12 | Create context.md for project context management |
| `ee15c36` | 2026-09-12 | Initial commit |

- **Files:** `README.md` (identical to `main`) and `context.md`, whose single line is *"Enter proj context in this file, update it after prompts or work session"*.
- **Status: empty placeholder.** The real project documentation lives in `API_INTEGRATION.md` (`backend`), `design-system/fleet-drishti/MASTER.md` (`new-frontend`), and `WORK_LOG.md` plus the working-tree `README.md` on the M5 laptop.

---

## 4. Branch: `backend` (M4)

**No new commits since the last report.** The head is still `80dfa32`, so the code is byte-for-byte what was reviewed last time. I still re-installed it, re-ran every test scenario, re-probed every bug on a fresh database, and re-read the parts the integration check depends on (`SEVERITY_SCORES` and the analytics filters).

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
- `app/main.py`: the FastAPI app ("CityLens Backend (M4)"), CORS from `settings.cors_origins`, 7 routers, and `GET /health` (no auth; verified 200).
- `app/config.py`: pydantic-settings `Settings` with `database_url` (required), `env` and `cors_origins`, read from `.env`.
- `app/database.py`: SQLAlchemy engine, `SessionLocal`, `Base`, and `get_db()`.

**Data model** (`app/models/core.py`, UUID primary keys throughout)
- `Bus` (`bus_code`, `route_id`), `Route` (`route_code`, `name`), `Camera` (`camera_code`, `bus_id`).
- `Event`: one raw observation, with `type`, `subtype`, `confidence`, `lat`, `lng`, `timestamp`, `bus_id` (required FK), `route_id`, `camera_id` and `issue_id`.
- `Issue`: the fused, persistent problem, with `type`, `subtype`, `lat`, `lng`, `severity` (label), `priority` (0–100), `confidence` (noisy-OR), `status` (default `unresolved`), `first_seen` and `last_seen`.
- `Evidence`: `event_id`, `frame_path`, `video_path`, `timestamp`, `lat`, `lng`, `bus_id`, `route_id` and `confidence`. **These are string paths only; no bytes are stored.**
- `CitizenReport`: `description`, `photo_path`, `video_path`, `timestamp`, `lat`, `lng`, `status` and `matched_issue_id`.
- `Authority`: `name`, `email`, `password_hash` (bcrypt) and `role`.

**Routes.** Every GET requires a JWT (verified: `GET /events` without a token returns 403). POSTs to events and evidence require role `admin` or `authority`.
| Endpoint | Auth | What it does |
|---|---|---|
| `POST /auth/login` | none | bcrypt check, returns an HS256 JWT (60 min) plus role |
| `POST /events` | authority | Checks that `bus_id` exists, stores the event, runs issue fusion |
| `GET /events`, `GET /events/{id}` | JWT | List (timestamp desc, skip/limit) and fetch |
| `GET /issues`, `GET /issues/{id}` | JWT | List (`last_seen` desc) and fetch |
| `PATCH /issues/{id}/status` | authority | Sets status to **any string** |
| `POST /evidence`, `GET /evidence[/{id}]` | authority / JWT | Metadata-only records; validates that the event and bus exist |
| `POST /citizen-reports` | **none (public)** | Stores the report, matches the nearest issue of any type within 50 m, fuses 0.6 × 0.5 into its confidence |
| `GET /citizen-reports` | JWT | List |
| `GET /buses`, `/buses/{id}`, `/routes` | JWT | Read-only. **No create/update endpoints**; fleet data comes only from the seed |
| `GET /analytics[/defects\|/congestion\|/routes\|/coverage]` | JWT | `COUNT`/`GROUP BY` aggregates |

**Services**
- `issue_service.py` is the real logic:
  - **Matching:** an event joins an issue with the same `type` and `subtype` within **50 m** (equirectangular approximation), found by a linear scan.
  - **Confidence:** sequential noisy-OR, `C_n = 1 − (1 − C_{n−1})(1 − c·w)`. The weight `w` is 1.0 for a new bus, 0.3 for a same-bus repeat within 24 h, and 0.5 for a citizen report. Confidence is capped at 0.97.
  - **Priority (0–100):** a severity base, plus confidence × 15, a repeat bonus (≤12), a traffic term of **0.5 × 8 (hard-coded placeholder)**, and an age bonus (≤10).
  - **Severity:** bucketed from `SEVERITY_SCORES` = {`pothole` 70, `road_damage` 80, `waterlogging` 85, `damaged_divider` 75, `missing_zebra_crossing` 80, `damaged_traffic_sign` 65, `other_hazard` 60}. Unknown subtypes get 50, which is labelled `low`.
- `event_service`, `evidence_service`, `fleet_service`, `citizen_report_service`, `analytics_service` and `auth_service` are thin CRUD, validation and aggregation layers. `dependencies/auth.py` holds the JWT guards.

**Migrations:** 7 linear Alembic revisions. **Verified:** `alembic upgrade head` applies cleanly to an empty Postgres 18.2 database.

**Seeds:** `app/seed_authority.py` creates `admin@citylens.com` / `admin123` (admin). `seed_demo.py` creates 2 routes, 2 buses (`BUS-014`, `BUS-027`), 2 cameras, 6 events, 5 issues and 2 citizen reports. **Verified:** it printed exactly those counts.

**Docs:** `API_INTEGRATION.md` is an accurate endpoint reference. `.env.example` is present but broken (bug 1).

### 4.3 Uncommitted work
None on the remote branch. The local `backend` branch now equals `origin/backend`.

### 4.4 Dependencies
`requirements.txt` (fastapi, uvicorn, sqlalchemy, psycopg2-binary, alembic, pydantic, pydantic-settings, python-dotenv, python-jose, passlib, bcrypt, requests, pytest). **Verified:** it installs cleanly on Python 3.12.6 and covers every third-party import.

### 4.5 README
The same 2-line stub as `main`. Setup steps (DB, migrate, seed, run) are not written down anywhere.

### 4.6 Tests (verified)
All 5 test files are **live-HTTP integration tests** against `http://127.0.0.1:8000`, with no `TestClient` and no DB fixtures.

| Scenario | Result | Why |
|---|---|---|
| Fresh clone: no `.env`, no server | **2 collection errors, 0 run** | `test_fusion.py` imports `app.models`, and `Settings()` fails without `DATABASE_URL`. `test_event_flow.py` is **a script, not a test**: it makes HTTP calls at import time (`ConnectionError`). |
| No `DATABASE_URL`, server running | **1 collection error** | Only `test_fusion.py` fails. `test_event_flow.py`'s import-time calls succeed when a server happens to be up. |
| Server running, DB migrated and seeded | **19 passed, 5 failed** | All 5 are **404 on `POST /events`** caused by hardcoded bus, route and camera UUIDs (`fff745f2-…`, `312f8278-…`) from one developer's DB. **This is a fixture problem, not a code bug.** |
| Same, with the 6 UUIDs replaced by the seeded ones (scratch copy) | **24 passed, 0 failed** | Fusion math, noisy-OR persistence, evidence validation, citizen-report matching and the smoke endpoints all work. |

### 4.7 Bugs, re-probed on the live server (all verified again unless noted)
1. **Following `.env.example` crashes the app at startup:** `ValidationError: jwt_secret_key – Extra inputs are not permitted`. Deleting that line makes the JWT secret silently fall back to the **hard-coded `"citylens-dev-secret-change-me"`**, because `auth_service` reads `os.getenv`, which `.env` never populates.
2. **Non-UUID IDs return 500.** `POST /events` with `"bus_id": "BUS-014"` returns **500**, and `GET /events/not-a-uuid` returns **500**. `GET /issues/not-a-uuid` correctly returns 404.
3. **UTC timestamps are silently shifted.** An event posted as `2026-09-24T10:00:00+00:00` was stored and returned as **`2026-09-24T15:30:00`**, because the column is `timestamp without time zone` and the session timezone is IST. `created_at` is naive `utcnow()`, so the two columns use different clocks. The edge always sends `+00:00`, so every real event is affected.
4. **`PATCH /issues/{id}/status` accepts any string:** `{"status":"banana"}` returns 200.
5. **Every event type becomes a persistent Issue.** A `traffic_density/heavy` event created an Issue with status `unresolved`, severity `low` and priority 66.24.
6. **`/analytics/congestion` only counts `type == "traffic"`.** With 16 `traffic_density` events in the DB (15 from the real edge runner, 1 from my probe), the endpoint still returned only the seed's `[{"subtype":"traffic_congestion","count":2}]`.
7. `seed_demo.py` prints `→` in its final summary. Last time this crashed a Windows console with `UnicodeEncodeError`. **Not reproduced this time** (piped output); it depends on the console encoding. Cosmetic either way, since the data is committed before the print.
8. Unknown extra fields are silently dropped: an event with `plate_number` returned 201.

### 4.8 Hardcoded values
| Where | What | Severity |
|---|---|---|
| `alembic.ini` | `postgresql://akshaykumar@localhost:5432/citylens_db` (personal username; overridden by `env.py`, but leaked) | Low |
| `app/services/auth_service.py` | JWT secret fallback `"citylens-dev-secret-change-me"` | **High**, combined with bug 1 |
| `seed_authority.py`, tests, `API_INTEGRATION.md` | `admin@citylens.com` / `admin123` | Medium (demo only) |
| `tests/*.py` | 6 UUIDs from one developer's DB, and `API_URL = "http://127.0.0.1:8000"` | Breaks tests everywhere else |
| `issue_service.py` | `TRAFFIC_EXPOSURE_PLACEHOLDER = 0.5` | Design gap (acknowledged in comments) |

### 4.9 TODO/FIXME
No `TODO`/`FIXME` markers. There is one documented placeholder (`TRAFFIC_EXPOSURE_PLACEHOLDER`) and one migration comment about intentionally skipped schema drift (`uq_event_id`).

### 4.10 Real vs. stubbed
- **Real:** schema and migrations, JWT auth, all CRUD endpoints, noisy-OR fusion, priority, citizen-report spatial matching, and basic analytics.
- **Stub:** the traffic term in priority; evidence (paths only, with no upload, storage or serving); fleet management (seed only); a single user role, with no registration and no citizen accounts.

---

## 5. Branch: `m5-edge-runtime` (M5, plus M2 logic)

> ⚠️ **This branch now exists in three states, and only the first is on GitHub.**
>
> | State | Where | Contents | Risk |
> |---|---|---|---|
> | **Pushed** `067da98` | origin | Base mock pipeline, 20 files | Safe |
> | **Committed, not pushed** `7006109` | this laptop only | + all M2 logic, YOLO plumbing, `requirements.txt`, `WORK_LOG.md`, `STATUS_UPDATE.md` (36 files) | **Lost if this machine is lost**; invisible to the team |
> | **Uncommitted** working tree | this laptop only | + motion gate (2 new files, 3 modified, +83/−1 in tracked files, 326 lines in new files) | **Lost on any checkout/reset**, and not even in the local reflog |

### 5.1 Commit history
| Hash | Date | Author | Message | Pushed? |
|---|---|---|---|---|
| `7006109` | 2026-09-24 20:47 | Hdawgg | Add M2 traffic/safety logic, YOLO detector plumbing, and density/hazard monitors | **No** |
| `067da98` | 2026-09-13 14:58 | HaleHenry-rig | Build edge AI runtime reliability and tests | yes |
| `225ba2a` | 2026-09-13 14:30 | HaleHenry-rig | Build edge AI runtime pipeline | yes |

`7006109` stat: `STATUS_UPDATE.md` +544, `WORK_LOG.md` +73, `requirements.txt` +16, `src/anpr.py` +150, `src/config.py` ±80, `src/density.py` +172, `src/detectors/{pedestrian,road_defect,vehicle}_detector.py` and `yolo_backend.py` (+116/+135/+138/+107), `src/event_formatter.py` ±78, `src/incident.py` +180, `src/pedestrian_safety.py` +148, `src/runner.py` ±233, `src/tracker.py` +196, and tests `test_density` +129, `test_event_formatter` ±81, `test_pedestrian_safety` +200, `test_road_defect_detector` +135 and `test_vehicle_detector` +113.

### 5.2 Committed code (`7006109`) and what each file does
Modules import each other by bare name (`from config import …`), so everything must run with `src/` on the path. `runner.py` must also be started from a directory containing `sample.mp4`.

**Base pipeline (pushed in `225ba2a`/`067da98`, unchanged since)**
- `config.py`: `BUS_ID`, `ROUTE_ID`, `CAMERA_ID` (env, **defaulting to UUIDs from one dev DB**), `BACKEND_URL` (`http://127.0.0.1:8000`), `FRAME_SAMPLE_RATE` (5), plus all the M2 settings added in `7006109`.
- `video_reader.py`: OpenCV **file** reader that yields every `FRAME_SAMPLE_RATE`-th frame with `frame_number` and `timestamp_seconds = frame_number / fps`. Nothing handles live camera or RTSP input.
- `detectors/base.py`: the `Detection(class_name, confidence, bbox)` dataclass and the `Detector` ABC.
- `detectors/mock_detector.py`: **always one `pothole` at 0.90 at a fixed box, on every frame, regardless of content.**
- `dedup.py`: the same class, a box centre within 100 px, and `t − last_seen ≤ 1.0 s` count as a duplicate. The runner hardcodes `Deduplicator(max_distance=100.0, max_gap_seconds=1.0)`, not configurable (this matters for §5.7).
- `gps_provider.py`: `SimulatedGPS` returns **one fixed point (19.0760, 72.8777)**, the same spot as the backend seed's demo pothole. It has no speed signal.
- `event_formatter.py`: `build_event()`, the single payload builder (§9.1).
- `evidence.py`: writes `evidence/detection_frame_<frame_number>.jpg`. Filenames collide across runs and across event types on the same frame.
- `event_queue.py`: SQLite queue (`edge_queue.db`) with `init_queue`, `enqueue_event`, `get_queued_events` and `remove_event`.
- `backend_client.py`: **logs in on every call** with hardcoded admin credentials, POSTs the event, queues on any `RequestException`, and has `flush_queue()`.

**Added in `7006109` (was uncommitted last time; code unchanged from what the last report reviewed)**
- `detectors/yolo_backend.py`: lazy `ultralytics.YOLO` loader with a model cache, normalising results into `RawBox`.
- `detectors/road_defect_detector.py`: maps model labels, including RDD2022 `D00/D10/D20/D40`, onto `pothole`, `damaged_road`, `missing_divider`, `missing_zebra_crossing`, `damaged_signboard` and `waterlogging`. YOLO mode needs `models/road_defect_yolov8.pt`, **which does not exist.** Mock mode is the always-pothole detector.
- `detectors/vehicle_detector.py`: COCO `car/bus/truck/motorcycle/bicycle` mapped to 4 classes, plus `count_by_class()`. YOLO mode uses public `yolov8n.pt`. **The mock cycles counts (2, 5, 9, 13, 13, 4) per call and ignores the frame.**
- `detectors/pedestrian_detector.py`: COCO `person` becomes `pedestrian`. **The mock walks one synthetic pedestrian by call count and ignores the frame.**
- `density.py`: a rolling 10 s mean vehicle count, where ≥6 is moderate and ≥12 is heavy. It emits on a level change or every 30 s. **This is a heuristic, not a model.**
- `pedestrian_safety.py`: fixed-geometry hazard zones (`crossing_ahead`, `group_crossing`, `close_pedestrian`). **This is a heuristic.**
- `tracker.py`: greedy IOU tracker with pixel speed and direction-reversal counts. **Not wired, no tests.**
- `incident.py`: rash-driving and hit-and-run heuristics in pixel space that ignore the bus's own motion. **Not wired, no tests, and no event type.**
- `anpr.py`: EasyOCR plus an Indian plate regex. The mock fabricates `MH12AB1001…`. **Not wired, no tests.**
- `runner.py` (as committed): runs 3 detectors per sampled frame, then dedup, density and hazard monitors, then `emit_event()`, and prints `PipelineStats`.
- `requirements.txt`: opencv-python 5.0.0.93, numpy 2.5.2, requests 2.34.2, ultralytics 8.4.128, torch 2.13.0, torchvision 0.28.0, easyocr 1.7.2 and pytest 9.1.1. **Verified:** the core four install on Python 3.12.6. I did **not** install torch, ultralytics or easyocr, so **YOLO and OCR modes remain unexercised.**
- `WORK_LOG.md`: an accurate history, but **stale** (see §0 item 9).

### 5.3 Uncommitted work (verified with `git status` at the time of this report)
```
 M README.md       | 35 +++   (motion-gate section; committed README is 0 bytes)
 M src/config.py   | 21 +++   (MOTION_GATE_ENABLED, MOTION_DIFF_THRESHOLD,
                                MOTION_PIXEL_NOISE_THRESHOLD, MOTION_GATE_MAX_GAP_SECONDS)
 M src/runner.py   | 28 +++-  (MotionGate before GPS/detectors; frames_sampled/processed/skipped)
?? src/motion_gate.py        (184 lines)
?? tests/test_motion_gate.py (142 lines)
```
Nothing else is uncommitted. `event_formatter.py`, `backend_client.py`, the detectors and dedup are identical to `7006109`.

**What the motion gate does (read from the code):**
- `MotionGate.should_process(frame, timestamp_seconds)` runs on every frame `video_reader` has already sampled. It **sits on top of `FRAME_SAMPLE_RATE`**; it does not replace it.
- It shrinks the frame to 320 px wide (`INTER_AREA`), converts it to grey, and takes `absdiff` against the **last processed** frame. Pixels whose difference is above `MOTION_PIXEL_NOISE_THRESHOLD` (default 25) count as changed. The frame passes if the changed share is **strictly above** `MOTION_DIFF_THRESHOLD` (default 2.0 %).
- It always passes a frame once `MOTION_GATE_MAX_GAP_SECONDS` (default 1.0 s, in video time) has elapsed since the last processed frame. The first frame, and any change in frame size, also force a pass.
- Buffers are allocated once per frame size and swapped rather than copied. `MOTION_GATE_ENABLED=false` makes it a pass-through.
- In `runner.py`, skipped frames `continue` before GPS lookup and all three detectors. Only processed frames reach detection, dedup, the monitors and evidence.

### 5.4 Dependencies vs imports
`requirements.txt` (now committed) covers every third-party import: `cv2`, `numpy`, `requests`, and lazily `ultralytics` and `easyocr`. The motion gate adds **no new dependency** (only `cv2` and `numpy`).

### 5.5 Tests (verified)
| State | How it was run | Result | Failure reason |
|---|---|---|---|
| Pushed `067da98` | `pytest tests` from repo root | **4 collection errors** | `ModuleNotFoundError`: there is no `conftest.py`/`pytest.ini` to add `src/` to the path |
| Pushed `067da98` | `cd src && pytest ../tests` | **10 passed, 2 failed** | `test_video_reader` ×2: `Could not open video: sample.mp4`. **Missing fixture, not a code bug.** The file is also blocked by `*.mp4` in `.gitignore`, and the tests hardcode `frame_count == 189`. |
| Local commit `7006109` | from repo root | **8 collection errors** | Same path problem |
| Local commit `7006109` | `cd src && pytest ../tests` | **55 passed, 2 failed** | Same 2 `sample.mp4` failures |
| Working tree | from repo root | **9 collection errors** | Same path problem |
| Working tree | `cd src && pytest ../tests` | **67 passed, 2 failed** | Same 2 `sample.mp4` failures |
| Working tree | `cd src && pytest ../tests/test_motion_gate.py -v` | **12 passed** | — |

The motion-gate unit tests use synthetic numpy frames. They cover identical frames gated out, a large region change passing, the max-gap forcing a pass, the exact threshold boundary (100 px of 10,000 is gated, 101 passes), the noise-threshold boundary, comparison against the last *processed* frame, the disabled gate, greyscale input, downscaling of large frames, and a frame-size change.

**What they do not cover:** the interaction with `Deduplicator` (§5.7), real encoded video, and non-integer frame rates. There are still no tests for `tracker.py`, `incident.py`, `anpr.py`, `backend_client.py` or `runner.py`.

### 5.6 Motion gate on real pipeline runs (verified on synthetic video; NOT verified on real footage)
**No real bus footage exists in the repo or on this machine, so every number below comes from synthetic clips.** They show how the code behaves. They are not a prediction for real Mumbai footage.

Clips: 640×360 at 30 fps, mp4v-encoded, with Gaussian sensor noise (σ = 3) on every frame. There are two families:
- **Smooth:** a blurred low-contrast asphalt texture with lane markings.
- **Street:** a high-contrast roadside of random building, pole and vehicle blocks.

Settings are the defaults: `FRAME_SAMPLE_RATE=5`, diff 2.0 %, noise 25, max-gap 1.0 s.

**A. The gate on its own** (real `read_video` + `MotionGate` from the working tree; ~6 sampled frames per second of video)
| Clip (20 s unless noted) | Sampled | Processed | **Skipped** | Passes forced by max-gap | Longest gap between processed frames |
|---|---|---|---|---|---|
| Static scene (bus parked, nothing moving) | 120 | 20 | **83.3 %** | 19 | 1.000 s |
| Street, stationary, one large vehicle (~9 % of frame) and 2 pedestrians moving | 120 | 53 | **55.8 %** | 0 | 0.667 s |
| Street, bus moving (roadside scrolls 6 px/frame) | 120 | 120 | **0.0 %** | 0 | 0.167 s |
| Smooth, stationary, 3 small vehicles creeping | 120 | 20 | **83.3 %** | 19 | 1.000 s |
| **Smooth, bus moving** (asphalt scrolls 4 px/frame) | 120 | 20 | **83.3 %** | 19 | 1.000 s |
| Street mixed, 50 s: moving 10 s → static 20 s → traffic 10 s → moving 10 s | 300 | 167 | **44.3 %** (per segment: 0 / 83.3 / 55.0 / 0 %) | 20 | 1.000 s |

What this shows:
- **The safety net works:** in every run, the longest gap between processed frames was ≤ `MOTION_GATE_MAX_GAP_SECONDS`.
- **Static scenes hit the predicted ceiling exactly:** 1 of every 6 sampled frames, 83.3 %.
- **Low-texture blind spot (new finding):** on the smooth clip, a *moving* bus changed only **~0.56 %** of pixels between sampled frames (mostly lane markings), below the 2 % threshold. The gate treated it as static and processed only one frame per second. How often real footage looks like this (plain asphalt, night, rain, low sun) is **unknown until the gate is run on real footage**. On the same smooth clips, noise 10 / diff 0.5 % gave 0 % skipped when moving, 1.7 % in traffic and still 83.3 % when static. The defaults are **untuned**.

**B. The full `runner.py` against the live backend** (mock detectors, seeded bus, route and camera IDs via env)
| Run | Clip | Frames sampled / processed / skipped | Detections seen | Events sent | Evidence sent |
|---|---|---|---|---|---|
| Working tree, gate on | street mixed, 50 s | 300 / 167 / **133 (44.3 %)** | 1,618 | 13 | 13 |
| Working tree, `MOTION_GATE_ENABLED=false` | same | 300 / 300 / 0 | 2,900 | 13 | 13 |
| Committed `7006109` runner (no gate) | same | (not reported by this version) | 2,900 | 13 | 13 |
| Working tree, **default config** (no `BUS_ID` env) | same | — | — | **crash** | `sqlite3.OperationalError: no such table: event_queue` (unchanged bug, §5.8 #1) |

- The runner's printed counters **match the standalone harness exactly** (300/167/133), so the stats are correct.
- The gate cut detector calls by 44 % on this clip, and both runs sent the same 13 events (1 pothole, 10 `crossing_ahead`, 2 `traffic_density/moderate`). Event frames shifted by up to 45 frames (1.5 s).
- **Caveat:** the mock vehicle and pedestrian detectors advance per call and ignore pixels. So "same events with and without the gate" says **nothing about whether the gate costs real detection recall.** That can only be measured with real weights on real footage.

### 5.7 Motion gate × dedup: duplicate-event regression (verified; uncommitted code)
The gate's safety net forces a pass every **≥ 1.0 s** on a static scene. `Deduplicator` in `runner.py` forgets an object once **> 1.0 s** has passed since it was last seen. With the defaults the two windows meet exactly at 1.0 s, so whether a static object is re-reported depends on floating-point timestamps:

| Run (static clip, one mock pothole in view the whole time) | Pothole events sent |
|---|---|
| 30 fps, defaults, gate on | 1 |
| 30 fps, defaults, gate off | 1 |
| **29.97 fps, defaults, gate on** | **20** (one per forced pass) |
| 29.97 fps, defaults, gate off | 1 |
| **30 fps, `MOTION_GATE_MAX_GAP_SECONDS=2.0`, gate on** | **10** |

A sweep over common frame rates (12/15/20/24/25/29.97/30 fps) and `FRAME_SAMPLE_RATE` 1/3/5/7 found **every forced pass** exceeding the dedup window in 14 of 28 combinations. Among them is **29.97 fps at the default sampling rate of 5**, a very common camera frame rate.

In the backend, each duplicate is a same-bus repeat, which fuses into the same Issue and pushes its confidence and priority up. The demo pothole issue in this run's DB ended at **41 events, confidence 0.97 (cap) and priority 100**. That total includes events from all runs, not only the gate runs.

**Status:** this is a real bug in the uncommitted motion gate, and it should be fixed before that work is committed. Possible fixes: keep the gate's max-gap strictly below the dedup window, derive one from the other, or make dedup's window configurable and larger. It also means **raising `MOTION_GATE_MAX_GAP_SECONDS` above 1.0 s for more savings is unsafe** as the code stands. The density and hazard monitors are not affected: they rate-limit their own events by timestamp (30 s and 5 s min-gaps), not by remembering objects.

### 5.8 Reliability bugs (all still present in `7006109` and the working tree)
1. `init_queue()` is defined but never called, so the first backend error of any kind crashes the runner (**re-verified**: default config crashes with `no such table: event_queue`).
2. `flush_queue()` is defined but never called, so the offline queue is write-only.
3. 4xx responses (404 unknown bus, 422) are treated as "offline" and queued. Once flushing exists, one bad event would block the queue, because `flush_queue` stops at the first failure.
4. `send_evidence` is unguarded, so an evidence POST failure after a successful event crashes the run.
5. There are two admin logins per detection (event plus evidence).
6. Evidence `frame_path` is an edge-local Windows path (`evidence\detection_frame_N.jpg`). The image never leaves the bus.
7. Event timestamps are wall-clock at runner start plus the video offset, not the recording time.
8. Evidence filenames collide across runs and event types.
9. **New:** motion gate × dedup duplicate events (§5.7).

### 5.9 Hardcoded values
| Where | What |
|---|---|
| `backend_client.py` | `EMAIL = "admin@citylens.com"`, `PASSWORD = "admin123"` (the edge logs in as the platform admin) |
| `config.py` | Default `BUS_ID`/`ROUTE_ID`/`CAMERA_ID` UUIDs from one developer's DB; `BACKEND_URL = http://127.0.0.1:8000` |
| `runner.py` | `VIDEO_PATH = "sample.mp4"` (relative to the current directory); `Deduplicator(max_distance=100.0, max_gap_seconds=1.0)` |
| `motion_gate.py` | `WORK_WIDTH = 320` (a module constant, not an env var) |
| `gps_provider.py` | Fixed point 19.0760, 72.8777 |
| `anpr.py` | The mock emits fabricated plates; they must never reach an enforcement UI unlabelled |

### 5.10 TODO/FIXME in code
- `road_defect_detector.py`: "TODO: train / obtain the fine-tuned road-defect weights…"
- `pedestrian_detector.py`: "TODO: telling school children from adults needs fine-tuned weights"
- `incident.py`: "TODO: these are heuristics, not a trained incident model…"
- `motion_gate.py`: no TODO markers. Speed-based thresholds were deliberately left out because `SimulatedGPS` has no speed; this is noted only in the design discussion, not in code or the README.

### 5.11 README
- **Working tree:** a real "Motion gate" section describing the four steps, the safety net, the dedup distinction and the env-var table (defaults 2.0 %, 25, 1.0 s), plus how to run its tests.
- **Committed:** 0 bytes.

Neither version documents how to run the pipeline, the `cd src` requirement or backend setup. The README does not mention the §5.7 interaction.

---

## 6. Branch: `new-frontend` (M3)

**No new commits since the last report.** The head is still `1ea1e11`. I re-ran install, build and lint, and re-checked the type vocabularies and the absence of HTTP calls directly from the commit.

### 6.1 Commit history
| Hash | Date | Message |
|---|---|---|
| `1ea1e11` | 2026-09-24 | Traffic: Mumbai-wide day/hour congestion heatmap |
| `0756cde` | 2026-09-24 | Redesign Fleet Drishti frontend with new design system (113 files, +6217/−3634) |
| `6a2eb87` | 2026-09-24 | Backup unfinished UI before redesign (this is the `old-ui` head) |

### 6.2 Files (153), grouped
- **Tooling:** Vite 8, React 19, TypeScript 6, Tailwind 4, MapLibre GL 6, react-router 7, oxlint. Scripts: `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`. **There is no `test` script.**
- **Design system:** `design-system/fleet-drishti/MASTER.md`, a substantive spec ("say where the data came from", "never imply live data that isn't live").
- **Pages** (16 routes): Command Center (`/`), Live Map, Fleet and Bus Detail, Road Issues and Issue Intelligence, Traffic (day/hour heatmap), Safety, Infrastructure, Routes and Route Detail, Analytics, Priority Queue, Cameras, Live AI, Architecture and NotFound.
- **Components:** GIS (`GISMap.tsx` on MapLibre with OpenFreeMap/OSM tiles), AI (`DetectionPlayer`), events, telemetry, KPI tiles, traffic panels and UI primitives.
- **Services:** every method returns `mockAsync(<fixture>)`. **Re-verified: 0 occurrences of `fetch(`, `axios`, `import.meta.env` or `VITE_` in `src/`.**
- **Data:** hand-written mock fixtures (buses labelled `SIMULATED`); **real** BEST GTFS routes and stops (croyla/mumbai-gtfs, MIT-0); **real** OSM road geometry (5,467 ways); a **synthetic** "Deterministic DEMO traffic model"; and `recordedClips.ts` = `[]`.

### 6.3 Uncommitted work
None.

### 6.4 Dependencies
**Verified:** `npm ci` installs cleanly from the lockfile.

### 6.5 README
The unmodified Vite template.

### 6.6 Build, lint and tests (verified)
- `npm run build`: **succeeds.** The main chunk is 1,511.79 kB (422.53 kB gzipped), plus GTFS and road-data chunks of 537 kB, 746 kB and 828 kB, with a chunk-size warning.
- `npm run lint`: **2 warnings, 0 errors.** They are `react-hooks(exhaustive-deps)` in `useAsyncData.ts:15` and an unused `calendar` in `scripts/ingest-gtfs.mjs:190`.
- **Tests: none.**

### 6.7 Hardcoded values
Public tile URLs (`tiles.openfreemap.org`, `tile.openstreetmap.org`, whose usage policy prohibits heavy use) and Google Fonts. No credentials, no backend URL.

### 6.8 TODO/FIXME
None.

### 6.9 Real vs. mock
- **Real:** the UI, map rendering, BEST route and stop geometry, and OSM roads.
- **Mock:** every event, issue, detection, bus position, camera, KPI and congestion value (mostly labelled `DEMO`/`SIMULATED`).
- **Missing:** login/auth UI, citizen-reporting UI, a landing page, and any backend call.

---

## 7. Branch: `old-ui` (M3, superseded backup)

| Hash | Date | Message |
|---|---|---|
| `6a2eb87` | 2026-09-24 | Backup unfinished UI before redesign |

- 145 files with the same stack and the same mock service pattern. `new-frontend` is built directly on this commit.
- **Verified:** `npm ci` (75 packages) and `npm run build` succeed (main chunk 1,450.24 kB, 396.90 kB gzipped). Lint gives **7 warnings, 0 errors**: 3 × "Cannot access refs during render" and 2 × ref-in-cleanup in `GISMap.tsx`, plus the same 2 as `new-frontend`. The last report said "about 6".
- No tests, no backend calls, Vite template README.
- **Status:** a backup. It holds components `new-frontend` dropped (`EdgePipelinePanel`, `EvidencePanel`, `CorrelationPanel`, `PedestrianRiskCard`, `VehicleIncidentPanel`, `PlaceholderPage`). It can be deleted once nothing needs salvaging.

---

## 8. Cross-check against team roles (M1–M6)

Legend: ✅ done · 🟡 partial / mock-only / caveats · ❌ not started / absent. In the "Where it lives" column: **pushed**, **local commit** (`7006109`, not pushed), or **uncommitted**.

### M1 — Road-defect ML/YOLO
| Deliverable | Status | Where it lives | Evidence |
|---|---|---|---|
| Dataset | ❌ | — | No images, labels or `data.yaml` in any branch |
| Training | ❌ | — | No training script, notebook or config |
| `best.pt` | ❌ | — | No `.pt`/`.onnx` anywhere. The edge expects `models/road_defect_yolov8.pt` |
| `classes.txt` | ❌ | — | The de facto class list is in `road_defect_detector.py` (local commit) and **disagrees with the backend** (§9) |
| **Overall** | **❌ Not started** | | No M1 commits. Every pothole in every run is `MockDetector` |

### M2 — Traffic and safety ML/YOLO
| Deliverable | Status | Where it lives | Specifics |
|---|---|---|---|
| Vehicle detection/classification | 🟡 | local commit | COCO `yolov8n.pt` path is plausible without training. **Never run with real weights** (ultralytics not installed) |
| Vehicle counting | 🟡 | local commit | `count_by_class()` exists; counts are not sent to the backend |
| Density estimation | 🟡 | local commit | Rolling-count threshold heuristic; wired and tested (10 tests) |
| Pedestrian safety zones | 🟡 | local commit | Fixed-geometry heuristic; wired and tested. No school-child detection |
| Vehicle tracking | 🟡 | local commit | Greedy IOU; **not wired, no tests** |
| Incident detection | 🟡 | local commit | Pixel-space heuristics, no ego-motion compensation; **not wired, no tests, no event type** |
| ANPR | 🟡 | local commit | EasyOCR + regex; never run on a real plate; **not wired, no tests** |
| **Overall** | **🟡 Heuristics and scaffolding; no trained model; about half unwired** | | Committed now, but **not pushed**. No commits by an M2 owner; this was written as part of the M5 work |

### M3 — Frontend and GIS
| Deliverable | Status | Specifics |
|---|---|---|
| Landing page | ❌ | `/` is the operator dashboard |
| Auth UI | ❌ | No login, token handling or guards. The backend returns 403 on every GET without a JWT (verified) |
| Fleet View | 🟡 | Mock buses with `SIMULATED` positions |
| Urban Intelligence Map | 🟡 | Real GTFS and OSM geometry; **all markers from mock data** |
| Issue Intelligence panel | 🟡 | Renders mock `Issue`s |
| Citizen Reporting UI | ❌ | Absent, although the backend endpoint is public |
| Analytics UI | 🟡 | Mock numbers; does not call `/analytics` |
| Backend integration | ❌ | **Zero HTTP calls (re-verified)** |
| **Overall** | **🟡 Visually far along, functionally disconnected** | Build green, 0 tests. No change since the last report |

### M4 — Backend and database
| Deliverable | Status | Specifics |
|---|---|---|
| DB models and migrations | ✅ | 7 migrations verified on a fresh Postgres 18.2 |
| Event API | ✅ | Works; 500 on non-UUID IDs and the timezone shift re-verified |
| Fleet API | 🟡 | Read-only; seed-only data |
| Issue API and fusion | ✅ | Noisy-OR verified. No status validation; transient types become Issues |
| Citizen API | ✅ | Works and fuses. Public, no rate limit, paths only |
| Analytics API | 🟡 | Congestion filters on `type == "traffic"`, which the edge never sends (re-verified) |
| Auth | 🟡 | JWT roles work. `.env.example` crash and insecure default secret re-verified |
| Evidence handling | 🟡 | Metadata only; no upload, storage or serving |
| **Overall** | **✅ Most complete; unchanged since the last report** | 24/24 with correct fixtures; 19/24 as shipped |

### M5 — Edge AI / video pipeline
| Deliverable | Status | Where it lives | Specifics |
|---|---|---|---|
| Video ingestion | 🟡 | pushed | File-only reader, hardcoded path, no sample video (`*.mp4` gitignored) |
| **Frame gating (motion gate)** | 🟡 **new** | **uncommitted** | Works and its counters are verified. 83 % skip on static, 0 % on textured driving (synthetic). **Duplicate-event bug at 29.97 fps (verified)**; low-texture blind spot; thresholds untuned; never run on real footage |
| AI model integration | 🟡 | local commit | YOLO plumbing exists; defaults to mocks; no road-defect weights |
| Tracking | 🟡 | local commit | Not wired, no tests |
| Event generation | ✅ | local commit | 3 event types, all accepted by the backend (201, re-verified) |
| Dedup | ✅ | pushed | Pixel-space, 6 tests. Fixed 1.0 s window now interacts badly with the gate (§5.7) |
| Evidence | 🟡 | pushed | Local JPG; only the path is sent |
| Offline queue | ❌ in practice | pushed | `init_queue`/`flush_queue` never called; crashes on first failure (re-verified) |
| Backend integration | 🟡 | pushed | Works with correct env IDs (verified); defaults crash; admin credentials hardcoded |
| **Overall** | **🟡 Mock pipeline works end to end; reliability layer broken; ~3,000 lines not on GitHub** | | 67/69 tests pass in the working tree (2 need `sample.mp4`), only from `src/` |

### M6 — Testing, dataset organisation, demo data, documentation
| Deliverable | Status | Specifics |
|---|---|---|
| Testing | 🟡 | Backend: 24 live-server tests with non-portable UUIDs, plus 1 script posing as a test. Edge: 69 unit tests (working tree), which need `cd src` and a missing `sample.mp4`. None exercise dedup together with the motion gate. Frontend: 0. **No CI, no contract test.** |
| Dataset organisation | ❌ | Nothing exists |
| Demo data | 🟡 | Backend seed (2 buses, 6 events). Frontend has unrelated fixtures (`BUS-101…` vs `BUS-014`/`BUS-027`). No demo video, and `*.mp4` is gitignored on the edge branch |
| Documentation | 🟡 | `API_INTEGRATION.md` and `MASTER.md` are good. `WORK_LOG.md` is now committed (locally) but stale. The edge README has content only in the working tree. Every other README is empty or a template. There are no run instructions for any component |
| **Overall** | **🟡 / mostly ❌** | No M6 commits |

---

## 9. Integration check (payload/schema mismatches)

I re-checked the code on each side: the edge's `build_event()` (identical in `7006109` and the working tree) against the backend's `EventCreate`, `SEVERITY_SCORES` and `analytics_service`, and the frontend's `src/types/*` and `lib/taxonomy.ts` read straight from `origin/new-frontend`.

**Did the motion gate or the M2 commit introduce any new mismatch?**
- **Payload shape:** no. The motion gate does not touch `event_formatter.py` or `backend_client.py`, and its four settings are edge-local; none are sent. `7006109` contains the same formatter the last report reviewed.
- **Behaviour:** yes, one new effect. The gate can multiply events for a static object (§5.7), which the backend's same-bus fusion turns into inflated confidence and priority. It is not a schema mismatch, but it is a new integration-level defect. The gate also shifts *when* events fire by up to ~1.5 s (verified), which is harmless given the fixed GPS.

### 9.1 Edge → Backend `POST /events`
**Shape: matches.** `{type, subtype, confidence, timestamp, gps:{lat,lng}, bus_id, route_id, camera_id}` against `EventCreate`. **Re-verified:** 201 for all three event types from the real runner.

| # | Field | Edge sends | Backend expects / does | Effect (re-verified this run unless noted) |
|---|---|---|---|---|
| 1 | `subtype` | `damaged_road` | `road_damage` (80) | **Verified:** `damaged_road` → severity `low`, priority 66.24. `road_damage` → `high`, 96.24 |
| 2 | `subtype` | `missing_divider` | `damaged_divider` | Same fallback to 50/`low` (read from code) |
| 3 | `subtype` | `damaged_signboard` | `damaged_traffic_sign` | Same (read from code) |
| 4 | `subtype` | never emits `other_hazard` | scored 60 | Unused |
| 5 | `type` | `traffic_density` (`moderate`/`heavy`) | analytics counts `type == "traffic"` | **Verified:** 16 `traffic_density` events in the DB (15 from the edge runner), and `/analytics/congestion` shows only the seed's 2 |
| 6 | `type` | `pedestrian_hazard` | no special handling | Becomes a persistent Issue (69 `crossing_ahead` events accumulated in this run's DB) |
| 7 | `type` | `traffic_density` | no special handling | **Verified:** Issue `unresolved`, `low`, 66.24 |
| 8 | `timestamp` | `…+00:00` | `timestamp without time zone` | **Verified:** 10:00Z stored as 15:30 |
| 9 | `bus_id` | a default UUID from someone's DB | must exist in this DB | 404, then the uninitialised-queue crash (**verified**). A bus code (`BUS-014`) returns **500** (**verified**) |
| 10 | auth | logs in as `admin@citylens.com` | admin or authority role | Works; there is no device identity |
| 11 | ANPR / incident fields | `incident.py` has `plate_number`, `track_id`, `speed_ratio` | no such fields | **Verified:** extras are silently dropped (201). Neither module is wired anyway |
| 12 | density detail | `counts_by_class`, `average_count` | no field | Lost |
| 13 | **new** — event multiplicity | motion gate + fixed 1.0 s dedup | same-bus repeats fuse at weight 0.3 | **Verified:** 20 pothole events instead of 1 at 29.97 fps (§5.7) |

### 9.2 Edge → Backend `POST /evidence`
The shape matches (13/13 evidence records created in each run). The semantics do not: `frame_path` is a bus-local path, no bytes are transferred anywhere, and `video_path` is never sent.

### 9.3 Backend → Frontend (the frontend makes no calls; this compares its types, re-read from `origin/new-frontend`)
| Concept | Backend | Frontend | Mismatch |
|---|---|---|---|
| ID | `id` | `eventId`, `issueId` | Name |
| Case | snake_case | camelCase | Everywhere |
| Coordinates | `lat`, `lng` | `latitude`, `longitude` (`types/common.ts`, `event.ts`, `issue.ts`, …) | Name |
| Event type | `road_defect`, `traffic_density`, `pedestrian_hazard` | `"road-defect" \| "traffic" \| "safety" \| "infrastructure" \| "environmental"` | Vocabulary |
| Issue type | same as event type | `"road-defect" \| "infrastructure" \| "safety" \| "traffic-blockage" \| "environmental"` | Vocabulary |
| Subtypes | edge `damaged_road`, `missing_divider`, …; backend `road_damage`, `damaged_divider`, … | `road-damage`, `missing-divider`, `faded-crossing`, `damaged-signboard`, …; unknown values become "Other Road Hazard(s)" (`taxonomy.ts`) | **Three different vocabularies** |
| Severity | `high/medium/low` (Issue only) | `"critical" \| "high" \| "medium" \| "low"` | The backend never produces `critical` |
| Issue status | default `unresolved`; any string accepted | `"new" \| "under-review" \| "action-required" \| "resolved"` | Only `resolved` overlaps |
| Issue extras | `priority`, `confidence` | `observationCount`, `observingBuses[]`, `relatedEventIds[]`, `evidence[]`, `location` | Aggregates the backend doesn't return; no `priority` field |
| Bus identity | UUID plus `bus_code` | `BUS-101`-style codes as IDs | Different keys |
| Auth | JWT on every GET | none | Every call would get 403 |

**Bottom line:** still **three taxonomies and no shared contract file.** Nothing in this round made that better or worse.

---

## 10. Vertical slice trace

**Target:** recorded video → pothole detection → edge pipeline → event → GPS/timestamp → backend → database → GIS map → pin on map

| # | Step | Works today? | Detail |
|---|---|---|---|
| 1 | Recorded video | 🟡 | No video in the repo, and `*.mp4` is gitignored. With a clip placed as `sample.mp4` in the current directory it works (verified with synthetic 30 and 29.97 fps clips) |
| 1b | **Motion gate** (new, uncommitted) | 🟡 | Runs and skips correctly (§5.6). **It can multiply static-object events at 29.97 fps (§5.7)** and may under-sample low-texture moving footage. Can be disabled with `MOTION_GATE_ENABLED=false` |
| 2 | Pothole detection | ❌ **Breaks here (for real detection)** | No road-defect weights. `MockDetector` "detects" a pothole on every processed frame of any video, including a blank one. YOLO mode fails (weights missing, ultralytics not installed) |
| 3 | Edge pipeline (dedup, evidence) | ✅ (mock) | Verified. Needs `src/` on the path and the **unpushed** `7006109` for the multi-detector runner |
| 4 | Event | ✅ | 201 for all three types (verified) |
| 5 | GPS / timestamp | 🟡 | One fixed point, so everything fuses into the demo pothole issue (41 events by the end of this run). The timestamp is wall-clock, and the backend shifts it by +5:30 (verified) |
| 6 | Backend | 🟡 | Works **only** with correct `BUS_ID`/`ROUTE_ID`/`CAMERA_ID` env vars. Defaults crash the edge (verified). A backend set up from `.env.example` will not start (verified) |
| 7 | Database | ✅ | Events, issues and evidence metadata stored (verified). No image bytes |
| 8 | GIS map | ❌ **Breaks here** | No HTTP client, no API URL, no login, mismatched fields and vocabularies (re-verified) |
| 9 | Pin on map | ❌ | Pins come only from `src/data/mock/*` |

**What you can demo today:** steps 1–7 with mock detectors and fixed GPS, viewed through Swagger `/docs` or `GET /issues`, and separately the frontend with its own mock data. The halves are not connected, and there is no real detection anywhere.

**Minimum to close the slice (dependency order):**
1. Push `7006109`. Fix §5.7, then commit and push the motion gate, or keep `MOTION_GATE_ENABLED=false` until it is fixed.
2. Fix the edge queue (`init_queue` at startup; treat 4xx as permanent).
3. Fix `.env.example`/`JWT_SECRET_KEY`.
4. Agree one type, subtype, status and severity vocabulary.
5. Store timestamps as `timestamptz`.
6. Frontend login plus a typed `fetch` client that maps `EventOut`/`IssueOut` onto markers.
7. Obtain *any* pothole-capable weights (a public RDD2022/pothole checkpoint) as a stopgap.
8. A per-frame GPS track (GPX/CSV beside the video).

---

## 11. Open items, ranked by what they block

| Rank | Item | Owner | Blocks | Effort guess |
|---|---|---|---|---|
| 1 | **No road-defect model**: no dataset, training, `best.pt` or `classes.txt`. | M1 | The headline feature; YOLO path untestable; M6 dataset work | Large. Stopgap: a public pothole/RDD2022 checkpoint |
| 2 | **Frontend not connected to the backend** (no client, no auth UI, mismatched types). | M3 (+M4) | Map-pin step, every "live" screen, citizen and auth deliverables | Medium |
| 3 | **No shared data contract**: three taxonomies, plus the timestamp timezone bug. | M4 lead + M1/M2/M3/M5 | Correct severity/priority, analytics, frontend filters, every integration | Small to agree, small edits everywhere. **Do before more names get baked in** |
| 4 | **M5/M2 work not on GitHub.** `7006109` (20 files, +2,941) is committed locally but **unpushed**. The motion gate is **uncommitted**. | M5 | Anyone else running or reviewing the edge; total-loss risk | Minutes to push `7006109`. The gate should wait for #5 |
| 5 | **Motion gate duplicate-event regression** (§5.7): at 29.97 fps with defaults, or any max-gap > 1 s, a static object is re-sent on every forced pass. Also untuned thresholds, a low-texture blind spot, and never run on real footage. | M5 | Committing the gate; trustworthy event counts and issue confidence | Small: tie the gate's max-gap to below the dedup window, or make dedup's window configurable and larger, and add a combined test. Then tune on real footage |
| 6 | **Edge reliability bugs:** `init_queue` never called (crash, re-verified), `flush_queue` never called, 4xx treated as offline, `send_evidence` unguarded, per-call admin login, hardcoded credentials and dev UUIDs. | M5 | Any real run beyond the happy path; the offline requirement | Small |
| 7 | **Backend startup and config bugs:** `.env.example` crash (re-verified), public default JWT secret, personal username in `alembic.ini`. | M4 | Every new setup; security | Small |
| 8 | **Evidence is metadata-only.** | M4 + M5 | Evidence views, citizen photos, verify-before-action | Medium |
| 9 | **Backend correctness bugs:** 500 on non-UUID IDs, any-string status, transient types become Issues, congestion analytics on the wrong type (all re-verified). | M4 | Clean demo data, trustworthy dashboards | Small to medium |
| 10 | **Fixed GPS and wall-clock timestamps.** | M5 | Meaningful placement and fusion; also blocks speed-aware gating | Small (GPX/CSV provider) |
| 11 | **Non-portable test infrastructure:** backend needs a live server and one developer's UUIDs; edge needs `cd src` and a gitignored `sample.mp4` with exactly 189 frames; no dedup+gate test; frontend has 0 tests; no CI. | M6 | Confidence in every change; would have caught #5 | Medium: `conftest.py`/`pytest.ini`, `TestClient` plus a fixture DB, a small committed clip (un-ignore it) |
| 12 | **M2 incident, tracking and ANPR unwired and untested**, with no event type or backend field. | M2 (+M4) | Incident and ANPR deliverables; Safety page categories | Medium to large |
| 13 | **Docs:** edge README content only in the working tree; `WORK_LOG.md` stale; the other READMEs empty or template; `context.md` a placeholder; no run instructions. | M6 (+M5) | Onboarding, judges running the project | Small |
| 14 | **Branch hygiene:** `main` empty; 3 orphan branches; stale, misnamed local `edge`; redundant `old-ui`; `STATUS_UPDATE.md`/`WORK_LOG.md` now tracked on the edge branch root. (Local `backend` is now caught up.) | Whole team | A single integrated build | Small, but needs an agreed layout |
| 15 | Minor: `seed_demo.py` console-encoding print; evidence filename collisions; 1.5 MB frontend bundle; OSM tile policy. | various | Polish | Trivial |

---

*Generated on 2026-09-24 by inspecting each branch in an isolated detached worktree. The backend and integration results come from real runs against a throwaway PostgreSQL 18.2 instance and the live FastAPI server. The motion-gate numbers come from synthetic clips, not real bus footage. No repository code was modified, and nothing was committed or pushed. This file is the only change to the working tree.*
