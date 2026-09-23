import { PanelHeader } from "../ui";

interface DetectionDistributionChartProps {
  buckets: { bucket: string; count: number }[];
  title?: string;
  meta?: string;
  icon?: string;
  emptyLabel?: string;
}

// Generic taxonomy-bucket distribution bar list. Used as "Detection
// Distribution" on the Command Center (validated Events by PS taxonomy —
// see analyticsService.computeDetectionDistribution) and reused as-is for
// "Road Issues by Type" on the Road Issues page, rather than duplicating
// this chart for a second, narrower taxonomy.
export function DetectionDistributionChart({
  buckets,
  title = "Detection Distribution",
  meta = "By Event Type",
  icon = "donut_large",
  emptyLabel = "No observations yet.",
}: DetectionDistributionChartProps) {
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm h-full flex flex-col gap-space-sm">
      <PanelHeader title={title} icon={icon} meta={<span className="font-label-code text-label-code text-ink-muted">{meta}</span>} />
      <div className="flex flex-col gap-space-xs justify-center flex-1">
        {buckets.map((b) => (
          <div key={b.bucket} className="flex items-center gap-space-sm">
            <span className="font-body-sm text-body-sm text-ink-secondary w-[150px] shrink-0 truncate">{b.bucket}</span>
            <div className="flex-1 h-2.5 rounded-full bg-surface-panel overflow-hidden">
              <div
                className="h-full rounded-full bg-gis-vector-blue/80"
                style={{ width: `${Math.max(6, (b.count / max) * 100)}%` }}
              />
            </div>
            <span className="font-label-code text-label-code text-ink-primary font-semibold w-6 text-right">{b.count}</span>
          </div>
        ))}
        {buckets.length === 0 && <span className="font-body-sm text-body-sm text-ink-muted">{emptyLabel}</span>}
      </div>
    </div>
  );
}
