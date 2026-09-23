import { StatusBadge } from "../ui";
import { CONGESTION_DISPLAY_LABEL, CONGESTION_TONE } from "../../lib/congestion";
import type { TrafficHotspot } from "../../types";
import type { VehicleClassCounts } from "../../services/analyticsService";

interface CorridorDensityCardProps {
  hotspot: TrafficHotspot;
  /** Prototype per-corridor vehicle mix (see
   * analyticsService.computeVehicleClassificationDemo) — always rendered
   * with an explicit "Prototype" tag so it never reads as a measured count. */
  classification?: VehicleClassCounts;
}

// One corridor's vehicle-density state: density level and observed speed
// are real (TrafficHotspot fields), fleet observation count is real, and
// the per-class vehicle mix is a clearly labeled prototype breakdown —
// demonstrating the Density -> Classification link the PS asks for without
// claiming a vehicle-classification model is in production.
export function CorridorDensityCard({ hotspot, classification }: CorridorDensityCardProps) {
  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm flex flex-col gap-space-xs">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-title-sm text-title-sm text-ink-primary font-bold truncate">{hotspot.location}</span>
          <span className="font-body-sm text-body-sm text-ink-muted truncate">{hotspot.corridor}</span>
        </div>
        <StatusBadge tone={CONGESTION_TONE[hotspot.congestionLevel]} className="shrink-0">
          {CONGESTION_DISPLAY_LABEL[hotspot.congestionLevel]} Density
        </StatusBadge>
      </div>

      <div className="flex items-center gap-space-md font-label-code text-label-code text-ink-secondary">
        <span>{hotspot.averageSpeedKph} km/h observed</span>
        <span>
          {hotspot.observingBusCount} fleet observation{hotspot.observingBusCount === 1 ? "" : "s"}
        </span>
      </div>

      {classification && (
        <div className="flex flex-col gap-1 pt-space-xs border-t border-border-slate">
          <div className="flex items-center justify-between">
            <span className="font-label-eyebrow text-label-eyebrow text-ink-muted uppercase tracking-widest">Vehicle Mix</span>
            <StatusBadge tone="info">Prototype</StatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-x-space-md gap-y-0.5 font-body-sm text-body-sm text-ink-secondary">
            <span className="flex justify-between">Cars <span className="font-semibold text-ink-primary">{classification.cars}</span></span>
            <span className="flex justify-between">Two-wheelers <span className="font-semibold text-ink-primary">{classification.twoWheelers}</span></span>
            <span className="flex justify-between">Buses <span className="font-semibold text-ink-primary">{classification.buses}</span></span>
            <span className="flex justify-between">Trucks <span className="font-semibold text-ink-primary">{classification.trucks}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
