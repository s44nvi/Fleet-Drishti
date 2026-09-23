import { PanelHeader } from "../ui";
import type { EventActivityDay } from "../../services/analyticsService";

interface EventActivityChartProps {
  days: EventActivityDay[];
}

// Last-7-days event volume as a small bar sparkline. The underlying series
// is illustrative demo data (see analyticsService's DEMO_EVENT_ACTIVITY doc
// comment) — labeled as such in the header rather than presented as a live
// backend aggregation.
export function EventActivityChart({ days }: EventActivityChartProps) {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm h-full flex flex-col gap-space-sm">
      <PanelHeader
        title="Event Activity"
        icon="monitoring"
        meta={<span className="font-label-code text-label-code text-ink-muted">Last 7 Days &middot; Demo Data</span>}
      />
      <div className="flex-1 flex items-end justify-between gap-space-xs px-space-xs pt-space-sm">
        {days.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1">
            <span className="font-label-code text-label-code text-ink-secondary font-semibold">{d.count}</span>
            <div
              className="w-full rounded-sm bg-primary-civic-active/80"
              style={{ height: `${Math.max(6, (d.count / max) * 96)}px` }}
            />
            <span className="font-label-eyebrow text-label-eyebrow text-ink-muted uppercase">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
