# Analytics — page override

Overrides `MASTER.md` for `/analytics` only. Every other page follows Master.

**Question:** What patterns are emerging, and what should we do about them?
**Character:** editorial reporting / decision support, not live monitoring.

## Deviations from Master

| Master rule | Analytics override | Why |
|---|---|---|
| §2 No gradients | The pipeline ribbon uses a domain-tone gradient. | The header is the shared Master §14 banner — no Analytics-specific hero. |
| §3 No paragraph under title | One subtitle line in the shared header, one dek line per chapter. | Editorial hierarchy. |
| — | Chapter titles 26px. | Strong type hierarchy below the shared header. |
| §1 One centerpiece | Centerpiece is the observation-trend chart. | — |
| §13 "Small multiples" | Replaced by chapters (below). | — |

## Composition

1. **Header** — the shared `PageHeader banner` (Master §14); actions: date range (`?range=7|30|90`) and city.
2. **View tabs** — Overview / Fleet Performance / Urban Trends / Reports (`?view=`), directly under the header.
3. **KPI band** — one hairline-divided strip; fixture snapshot, `SIMULATED`.
4. **Chapters** — 2px ink rule, number, title, dek, source badge on the right:
   - 01 Urban trends — `DEMO` period model: trend chart (dominant), category donut, location ranking, "What the period shows" readout (unboxed).
   - 02 Fleet & pipeline — `SIMULATED` fixture snapshot: full-width detection → action pipeline, confidence & corroboration, fleet table.
   - 03 Public reports — `EXTERNAL`, full-bleed white band, lead story + news grid, each item with source kind (BMC / Traffic Police / News / Citizen reports), publisher, date and link. Never mixed into fleet figures.

## Data rules

- No map or heatmap here — Traffic owns geography.
- Trend / category / location numbers come from one deterministic DEMO model (`analyticsService.getObservationPeriodDemo`) and are always badged DEMO.
- External items live in `src/data/external/publicReports.ts` with provenance; citizen accounts are labelled anecdotal.
