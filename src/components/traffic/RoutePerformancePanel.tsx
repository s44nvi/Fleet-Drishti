import { PanelHeader, StatusBadge } from "../ui";
import type { Route } from "../../types";

interface RoutePerformancePanelProps {
  routes: Route[];
}

// PS §"estimate route delays". The fixtures carry real route distance and
// active-fleet-assignment counts, but no scheduled/expected trip duration
// to compare against — there is no defensible way to compute an actual
// delay from what exists today. Rather than fabricate expected/observed
// travel times, this renders the intended structure with an explicit
// "Prototype" state so the capability is visibly staged for when trip-
// timing data is available, per the phase brief's guidance.
export function RoutePerformancePanel({ routes }: RoutePerformancePanelProps) {
  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm flex flex-col gap-space-sm">
      <PanelHeader
        title="Route Performance"
        icon="schedule"
        meta={<span className="font-label-code text-label-code text-ink-muted">Delay estimation &middot; Prototype</span>}
      />
      <div className="flex flex-col divide-y divide-border-slate">
        {routes.map((route) => (
          <div key={route.routeId} className="flex items-center justify-between gap-space-sm py-space-sm">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-title-sm text-title-sm text-ink-primary font-semibold truncate">{route.name}</span>
              <span className="font-body-sm text-body-sm text-ink-muted truncate">{route.corridor}</span>
              <span className="font-label-code text-label-code text-ink-secondary">
                {route.distanceKm} km &middot; {route.activeBusCount} active bus{route.activeBusCount === 1 ? "" : "es"}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <StatusBadge tone="info">Prototype</StatusBadge>
              <span className="font-label-code text-label-code text-ink-muted">Delay: &mdash;</span>
            </div>
          </div>
        ))}
        {routes.length === 0 && (
          <span className="py-space-md font-body-sm text-body-sm text-ink-muted">No routes assigned to the active fleet.</span>
        )}
      </div>
      <p className="font-body-sm text-body-sm text-ink-muted italic">
        Delay requires scheduled trip-duration data not yet in the fixture set — shown as a placeholder structure for the future model, not an invented figure.
      </p>
    </div>
  );
}
