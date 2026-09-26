# Fleet Drishti — Design System (MASTER)

Source of truth for every Fleet Drishti screen. Page-specific deviations live
in `pages/<page>.md`; when a page file exists its rules override this one.

Approved direction: light-mode urban operations product. The map and the
evidence (video / detection frame) carry the page; data is compact, visual and
honest about where it came from.

> Generated with `frontend-design` + `ui-ux-pro-max`. The ui-ux-pro-max
> `--design-system` output (dark glassmorphism, slate + green) was reviewed and
> **rejected** because it contradicts the brief; its live-data honesty rules,
> dense spacing dial and government/transit palettes were kept.

---

## 1. Principles

1. **One centerpiece per page.** Each workspace has one dominant visual (map,
   video, board, grid). Everything around it stays quiet.
2. **Show, don't describe.** Icons, thumbnails, badges, maps and small charts
   before sentences. No explanatory paragraphs on screen.
3. **Say where the data came from.** Every video, position and trend carries a
   source badge. Never imply live data that isn't live.
4. **List ↔ map.** Selecting a row selects its marker (fly-to + highlight);
   selecting a marker selects its row.
5. **Pages have different jobs.** Same system, different composition. Never
   copy the Command Center layout onto another page.

## 2. Color

Cool light canvas, white surfaces, navy ink, blue for interaction,
green/amber/red for state only, restrained purple for safety.

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F4F6F9` | App background |
| `surface` | `#FFFFFF` | Panels, rows, map chrome |
| `surface-2` | `#F7F9FC` | Hover rows, inset wells |
| `ink` | `#0E1A2B` | Primary text, titles, map tooltips |
| `ink-2` | `#475467` | Secondary text |
| `ink-3` | `#667085` | Meta text (4.6:1 on canvas — never lighter) |
| `line` | `#E3E8EF` | Borders, dividers |
| `line-strong` | `#CBD3DE` | Input borders, scrubber track |
| `action` | `#1D5FE0` | Buttons, links, selection, focus ring |
| `action-strong` | `#174BB8` | Hover / pressed |
| `action-soft` | `#EAF1FE` | Active nav pill, selected row |
| `ok` / `ok-ink` / `ok-soft` | `#16A34A` / `#15803D` / `#E8F6EE` | Online, resolved, low |
| `watch` / `watch-ink` / `watch-soft` | `#E08A00` / `#B45309` / `#FEF3E2` | Medium, idle, degraded |
| `alert` / `alert-ink` / `alert-soft` | `#DC2626` / `#B91C1C` / `#FDECEC` | High / critical, severe congestion, offline |
| `safety` / `safety-ink` / `safety-soft` | `#7C3AED` / `#6D28D9` / `#F1EAFE` | Pedestrian / safety category |
| `network` | `#8FA3BF` | BEST route network lines |

Rules
- Brand green lives in the logo only. Green in the UI **means OK/online**.
- Color never carries meaning alone: severity = dot + word, status = icon + word.
- Soft tints are backgrounds; `*-ink` variants are the text colors on them.
- No gradients, no glass, no dark theme.

## 3. Typography

One family: **Plus Jakarta Sans** (400/500/600/700/800). Tabular figures for
every number (`tabular-nums`).

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `text-display` | 30 / 36, -0.02em | 800 | Page title |
| `text-title` | 17 / 24, -0.01em | 700 | Panel / section title |
| `text-item` | 14 / 20 | 600 | Row title, list item |
| `text-body` | 13 / 20 | 400 | Body, table cells |
| `text-meta` | 12 / 16 | 500 | Metadata, timestamps, captions |
| `text-micro` | 11 / 14, +0.02em | 600 | Badges, map chips |
| `text-kpi` | 26 / 30, -0.02em | 800 | KPI values |

- Sentence case everywhere. No uppercase eyebrow labels. The only uppercase
  text is the fixed source badges (`LIVE`, `RECORDED`, `DEMO`, `SIMULATED`).
- No descriptive paragraph under page titles; a single context line
  (`Mumbai · Data as of 12 Sep, 10:44`) at most.

## 4. Icons

**Lucide** (`lucide-react`), 1.75 stroke. Sizes: 16 inline, 18 controls, 20
nav/tiles. A category icon sits in an `IconTile` (32–36px tinted rounded
square) coloured by its domain tone. Decorative icons beside text are
`aria-hidden`; icon-only buttons have `aria-label`.

Domain glyphs (see `src/lib/visuals.ts`): pothole `CircleDot`, road damage
`Construction`, waterlogging `Waves`, congestion `CarFront`, lane blockage
`OctagonAlert`, pedestrian `PersonStanding`, near-miss `Zap`, divider
`SeparatorVertical`, zebra crossing `Footprints`, signboard `Signpost`, bus
`Bus`.

## 5. Spacing & layout

4px grid (dense dashboard, ui-ux-pro-max density 8). Gaps: 8 inside rows, 12
inside panels, 16 between panels, 24 page gutter (16 on mobile).

App frame: 232px left sidebar (collapses to a top bar + drawer below 1024px),
content max-width 1600px. Map workspaces may go full-bleed.

## 6. Surfaces

Three tiers — not one card for everything.

| Tier | Treatment | Examples |
|---|---|---|
| Workspace | 12px radius, 1px `line` border, no header, controls float over it | Map, video player |
| Panel | White, 12px radius, 1px `line`, `shadow-panel` | Lists, charts |
| Row | No box; hairline divider; hover `surface-2`; selected `action-soft` | List items |
| Float | White, 10px radius, `shadow-float` | Map layer panel, control rail, drawer, tooltip |

Shadows: `shadow-panel = 0 1px 2px rgb(14 26 43 / .05)`,
`shadow-float = 0 8px 24px rgb(14 26 43 / .12), 0 1px 2px rgb(14 26 43 / .06)`.

## 7. Buttons & controls

36px high, 8px radius, `text-item`. Primary: solid `action` (one per view).
Secondary: white + `line-strong` border. Ghost: text only. Map control: 36px
square in a white rail. Focus: 2px `action` ring, 2px offset. Web targets ≥24px.

## 8. Badges

- **Severity**: coloured dot + word (`● High`).
- **Status pill**: soft tint + ink text + optional icon (`Online`, `Idle`).
- **SourceBadge** — strict semantics:
  - `LIVE` — only when a real, current stream backs the element. Red dot.
  - `RECORDED` — real captured footage / model output from the past. Shows capture time.
  - `DEMO` — illustrative placeholder or generated pattern. Dashed outline.
  - `SIMULATED` — fixture-driven simulated fleet/state (bus positions, fixture snapshots).
  Nothing in the current codebase qualifies as `LIVE`.

## 9. Charts

Hand-rolled SVG, no chart library. Single-hue ramps, small multiples instead
of multi-series tangles, direct labels, low-contrast gridlines. Every chart
shows its source badge and has an `aria-label` summary. Heat grid: 5-step
`surface-2 → watch → alert` ramp with value on hover/focus and a legend.

## 10. Maps

- Basemap: OpenFreeMap **Positron** (muted light vector); falls back to OSM
  raster if the style fails to load.
- Our data is the only color: BEST network in `network` grey-blue; selected
  route in `action` blue, 4.5px.
- Markers: 26px circle, white 2px ring, domain glyph in white on the domain
  tone; selected marker scales to 32px with an `action` halo; items < 5 min
  old get a single soft ring.
- Floating **layer panel** (top-left, collapsible), floating **control rail**
  (top-right: zoom in/out, recenter, open full map), scale bottom-left,
  compact attribution bottom-right.
- Tooltips: dark `ink` card, white text, 12px.
- Never a small map inside a titled card. A map is a workspace.

## 11. Motion

150ms hover/press, 200ms expand/collapse, `flyTo` on list selection (the one
signature motion). No entrance animations. Recency ring and any pulse stop
under `prefers-reduced-motion`.

## 12. Data integrity

- Do not invent GPS, camera health, AI status, ANPR, traffic measurements,
  confidence, coverage or live video. Derive, omit, or show an honest empty /
  DEMO state.
- Bus positions are always `SIMULATED`.
- Traffic day × hour patterns are `DEMO` until bus-derived traffic
  observations exist.
- Detection frames without footage are `DEMO`; attached real clips are
  `RECORDED`.

## 13. Page compositions

| Page | Question | Centerpiece | Supporting |
|---|---|---|---|
| Command Center | What's happening across Mumbai? | City situation map | DetectionPlayer, 4 KPIs, live events, city pulse, top locations |
| Live Map | Where is everything? | Full-bleed map | Layer panel, detail drawer |
| Fleet | Which buses are sensing the city? | Bus roster + route map | Status bar, camera state from fixtures |
| Road Issues | What's wrong with the roads? | Evidence-first list ↔ map split | Category chips |
| Traffic | How is the city moving? | MapLibre heatmap | Day selector, hour scrubber, corridor ranking, 7×24 grid |
| Safety | Where are people/vehicles at risk? | Risk map | Incident timeline, ANPR empty state |
| Infrastructure | What needs attention? | PS-category condition board | Compact map |
| Analytics | What patterns are emerging? | Small multiples | Pipeline funnel |

## 14. Page header + city banner

Every main workspace (Command Center, Live Map, Fleet, Road Issues, Traffic,
Safety, Infrastructure, Analytics) opens with the SAME header:
`<PageHeader banner title subtitle context? actions? />`.

- **Banner:** the Mumbai skyline + Sea Link panorama
  (`public/brand/mumbai-city-banner.webp`, referenced only from
  `components/layout/CityBanner.tsx`), full-bleed to the content column's
  top and sides, 176px (168px below 1024px; grows only if copy wraps on
  phones). One navy veil, strongest on the left behind the text, clearing
  to the right so the bridge stays vivid.
- **Crop:** fixed per breakpoint in `index.css` (`.fd-city-banner-img`) so
  the pylons, deck and a line of water stay in frame at every banner width.
  Pages never set their own crop, intensity or height.
- **Type:** `text-page-title` 46/52 800 (40/44 on phones) white, subtitle
  `text-page-subtitle` 17/26 (15/22) white/85, then the optional context
  line (meta, source badge). Title always starts 24px from the top.
- **Controls:** `actions` sit bottom-right in the banner (below the text on
  phones), as white fields — e.g. Analytics' date range + city.
- Detail screens (bus, issue, route…) use `PageHeader` without `banner`:
  same type scale, ink on the canvas.

## 15. Sidebar branding

The sidebar ends, on every screen, with `SidebarCityBranding`
(`components/layout/SidebarCityBranding.tsx`): the line-art Mumbai
illustration (`MumbaiLineArt.tsx` — Gateway of India, palms, skyline,
Bandra–Worli Sea Link, harbour ferry, water reflections; thin `civic`
blue strokes (#5873B0) with faint faces — never the banner photograph), then **Mumbai** / Urban Intelligence
Platform, a short rule, and the data caveat "Prototype · fixture data,
simulated fleet". Only the nav above it scrolls; the block stays anchored.
The drawing is always full size and centred (even side margins); on short
viewports the nav above scrolls instead.

## 16. GTFS transit network on maps

One GIS foundation (`GISMap`) for every page. Data: `scripts/ingest-gtfs.mjs`
turns the Mumbai-region GTFS (BEST, TMT, KDMT, VVMT) plus the OSRM
road-snapped BEST geometry into `public/data/gtfs/*` (fetched once per
session, never raw GTFS in the browser). Provenance: `src/data/gtfs/source.json`.

Visual hierarchy, strongest first:
1. Fleet Drishti sensing buses (DOM markers; DEMO density buses 22px vs 26px fixture).
2. AI observations (existing category markers).
3. Selected / hovered route — `action` blue, 4.5px.
4. GTFS routes — thin, agency-tinted, low opacity ramping with zoom.
   Road-snapped = solid; schematic stop-sequence = dashed and dimmer.
5. Stops — small white dots, tiered: hubs ≥ z10.5, busy ≥ z12.5, all ≥ z14, names ≥ z15.5.

Page defaults: Command Center / Fleet / Live Map show the network;
Road Issues, Safety and Traffic keep it as toggleable context, off by
default. Live Map adds route search.

Honesty: GTFS is the scheduled network — never live positions. Fixture buses
are SIMULATED; density buses are DEMO (deterministic, on real routes). Route
cards always state how geometry was derived.
