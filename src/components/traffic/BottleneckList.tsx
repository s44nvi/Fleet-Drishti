import { PanelHeader, StatusBadge } from "../ui";
import { CONGESTION_DISPLAY_LABEL, CONGESTION_TONE } from "../../lib/congestion";
import type { TrafficHotspot } from "../../types";

interface BottleneckListProps {
  /** Already filtered to the corridors worth flagging (high/severe) — see
   * Traffic.tsx. */
  bottlenecks: TrafficHotspot[];
}

// Congestion/Bottleneck Intelligence: the urgent subset of corridors, not
// the full network view (that's CorridorDensityCard, shown separately).
// Estimated delay is deliberately omitted — the fixtures have no basis for
// it (see Traffic.tsx's Route Performance section, which handles that gap
// explicitly rather than fabricating a number here).
export function BottleneckList({ bottlenecks }: BottleneckListProps) {
  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm flex flex-col gap-space-sm">
      <PanelHeader
        title="Active Bottlenecks"
        icon="traffic"
        meta={<span className="font-label-code text-label-code text-ink-muted">{bottlenecks.length} flagged</span>}
      />
      <div className="flex flex-col divide-y divide-border-slate">
        {bottlenecks.map((hotspot) => (
          <a key={hotspot.hotspotId} href="#traffic-map" className="flex items-center justify-between gap-space-sm py-space-sm group">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-title-sm text-title-sm text-ink-primary font-semibold truncate">{hotspot.location}</span>
              <span className="font-body-sm text-body-sm text-ink-muted truncate">{hotspot.corridor}</span>
              <span className="font-label-code text-label-code text-ink-secondary">
                {hotspot.averageSpeedKph} km/h &middot; {hotspot.observingBusCount} fleet observation
                {hotspot.observingBusCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center gap-space-sm shrink-0">
              <StatusBadge tone={CONGESTION_TONE[hotspot.congestionLevel]}>{CONGESTION_DISPLAY_LABEL[hotspot.congestionLevel]}</StatusBadge>
              <span className="font-label-code text-label-code font-semibold text-primary-civic-deep group-hover:text-primary-civic-active whitespace-nowrap">
                View on Map &darr;
              </span>
            </div>
          </a>
        ))}
        {bottlenecks.length === 0 && (
          <span className="py-space-md font-body-sm text-body-sm text-ink-muted">No active bottlenecks — network flowing normally.</span>
        )}
      </div>
    </div>
  );
}
