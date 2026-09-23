import { PanelHeader } from "../ui";
import type { Route } from "../../types";

interface ODFlowPanelProps {
  routes: Route[];
}

// PS §"analyse origin-destination traffic patterns". Route.origin/
// destination are real BEST-network stop names from the GTFS feed
// (src/data/gtfs) — genuine OD pairs, not invented ones. `activeBusCount`
// (also real, from the simulated fleet's route assignment) stands in as a
// flow-intensity proxy since there is no sensed vehicle/passenger volume
// per OD pair yet; the caption below says so explicitly rather than
// implying this is measured traffic flow.
export function ODFlowPanel({ routes }: ODFlowPanelProps) {
  const sorted = [...routes].sort((a, b) => b.activeBusCount - a.activeBusCount);
  const maxCount = Math.max(1, ...sorted.map((r) => r.activeBusCount));

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm flex flex-col gap-space-sm">
      <PanelHeader
        title="Traffic Flow (Origin → Destination)"
        icon="alt_route"
        meta={<span className="font-label-code text-label-code text-ink-muted">By Fleet Assignment</span>}
      />
      <div className="flex flex-col gap-space-xs">
        {sorted.map((route) => (
          <div key={route.routeId} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-space-sm">
              <span className="font-body-sm text-body-sm text-ink-primary font-semibold truncate">
                {route.origin} &rarr; {route.destination}
              </span>
              <span className="font-label-code text-label-code text-ink-secondary shrink-0">
                {route.activeBusCount} active bus{route.activeBusCount === 1 ? "" : "es"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-panel overflow-hidden">
              <div
                className="h-full rounded-full bg-gis-vector-blue/70"
                style={{ width: `${Math.max(8, (route.activeBusCount / maxCount) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {sorted.length === 0 && <span className="font-body-sm text-body-sm text-ink-muted">No route data available.</span>}
      </div>
      <p className="font-body-sm text-body-sm text-ink-muted italic">
        Real BEST route topology; volume reflects active fleet assignment, not measured passenger/vehicle flow.
      </p>
    </div>
  );
}
