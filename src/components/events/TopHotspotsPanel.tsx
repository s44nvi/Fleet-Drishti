import { PanelHeader } from "../ui";
import type { Hotspot } from "../../lib/hotspots";

interface TopHotspotsPanelProps {
  hotspots: Hotspot[];
  limit?: number;
}

// Spatially clustered intelligence — one row per area, not per raw
// detection. Every contributing taxonomy bucket is listed (not just the
// single heaviest one) so a location backed by several real signals — e.g.
// potholes AND congestion — reads as aggregated intelligence rather than
// collapsing to whichever type happens to carry the most weight.
export function TopHotspotsPanel({ hotspots, limit = 5 }: TopHotspotsPanelProps) {
  const visible = hotspots.slice(0, limit);
  const max = Math.max(1, ...visible.map((h) => h.count));

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm h-full flex flex-col gap-space-sm">
      <PanelHeader title="Top Hotspots" icon="location_on" meta={<span className="font-label-code text-label-code text-ink-muted">Spatial Clustering</span>} />
      <div className="flex flex-col divide-y divide-border-slate">
        {visible.map((hotspot) => (
          <div key={hotspot.location} className="flex items-center gap-space-sm py-1.5">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-space-sm">
                <span className="font-title-sm text-title-sm text-ink-primary font-semibold truncate">{hotspot.location}</span>
                <span className="font-label-code text-label-code text-ink-secondary font-semibold shrink-0">
                  {hotspot.count} signals
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-panel overflow-hidden">
                <div
                  className="h-full rounded-full bg-signal-alert/70"
                  style={{ width: `${Math.max(8, (hotspot.count / max) * 100)}%` }}
                />
              </div>
              <span className="font-body-sm text-body-sm text-ink-muted">{hotspot.types.join(" · ")}</span>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <span className="py-space-md font-body-sm text-body-sm text-ink-muted">No hotspots identified yet.</span>
        )}
      </div>
    </div>
  );
}
