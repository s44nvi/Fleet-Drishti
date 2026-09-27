# Demo Notes

Status of what's real vs. mock in the current demo build, as verified this
session (Playwright + curl against a live backend on `frontend-backend-integration`).

## Pages showing REAL backend data

- **Road Issues** (list + filters) — real `Issue` records from the backend,
  matched via `isRoadDomainType()` in `src/lib/taxonomy.ts`, which now
  matches both the backend's real `road_defect` value and the frontend's
  original mock `road-defect` value.
- **Issue detail** — real single-`Issue` fetch.
- **Live Map** — real event/issue coordinates plotted as markers.
- **Command Center's live event feed** — real `GET /events` data streamed
  into the "Live intelligence" panel.

## Pages still on mock/demo data

- **Fleet**
- **Routes**
- **Evidence**
- **Analytics**
- **Traffic**
- **Safety**
- **Infrastructure**
- **Citizen Reports** — no page exists for this yet in the frontend, despite
  the backend having a `citizen_reports` router and demo data seeded by
  `seed_demo.py`.

These pages/categories (e.g. Missing Divider, Rash Driving, Hit-and-Run)
are defined in `src/lib/taxonomy.ts` per the SIH problem statement, but
have no real backend-sourced data wired in yet — they render against the
frontend's own mock fixtures.

## M1/M2 real trained models

The real trained road-defect / pedestrian-hazard models (M1/M2) are **not**
wired into the live M5 edge pipeline. Running the pipeline with
`DETECTOR_MODE=yolo` currently only loads generic COCO-pretrained weights
(see `SETUP.md` §3.4), not the trained models. For this demo, M1/M2's real
model output is presented via slides/video rather than a live pipeline run.

## Known non-blocking issues

- **`/priority-queue` NaN warning** — flagged in an earlier session; the
  Priority Queue page (`src/pages/PriorityQueue/PriorityQueue.tsx`) and the
  Analytics `DetectionPipeline.tsx` reference priority-queue data that can
  produce a `NaN` in some computed field. Not investigated further this
  session — worth a follow-up pass before the page is shown live.
- **Pre-existing dev DB data predating bucketing fixes** — during M5
  pipeline verification, one pre-existing `Issue` (15+ days old) was found
  with `status: "in_progress"` (a value not otherwise seen or defined in
  current backend code) and `severity: null` despite having 84 linked
  observations. This is stale data in the dev database from before the
  current severity/status bucketing logic existed, not a bug in the current
  code path — worth reseeding or manually clearing before a clean demo run
  if that specific Issue would be visible.
