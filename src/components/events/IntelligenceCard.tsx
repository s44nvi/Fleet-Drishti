import { Link } from "react-router-dom";
import { StatusBadge } from "../ui";
import type { IntelligenceGroup } from "../../lib/intelligenceGrouping";

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// One card per fused real-world problem, not per raw observation — the
// Live Intelligence Feed's core job. Shows the mechanism the product is
// built on: repeated multi-bus observation, rising confidence, and
// centralized correlation, instead of repeating near-identical rows for
// the same pothole.
export function IntelligenceCard({ group }: { group: IntelligenceGroup }) {
  const confidenceTrend = group.confidenceSequence.join("% → ") + "%";
  const isRising =
    group.confidenceSequence.length > 1 &&
    group.confidenceSequence[group.confidenceSequence.length - 1] > group.confidenceSequence[0];

  return (
    <Link to={group.linkTo} className="flex flex-col gap-space-xs py-space-sm group">
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs min-w-0">
          <span className="font-title-sm text-title-sm text-ink-primary font-bold capitalize truncate">
            {titleCase(group.subtype)}
          </span>
          <span className="font-body-sm text-body-sm text-ink-muted truncate">{group.location}</span>
        </div>
        {group.corroborated && (
          <StatusBadge tone="live" className="shrink-0">
            Corroborated
          </StatusBadge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-space-md gap-y-0.5 font-label-code text-label-code text-ink-secondary">
        <span>
          {group.busIds.length} bus{group.busIds.length === 1 ? "" : "es"}
        </span>
        <span>
          {group.observationCount} observation{group.observationCount === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          Confidence {confidenceTrend}
          {isRising && <span className="material-symbols-outlined text-[14px] text-primary-civic-active">trending_up</span>}
        </span>
      </div>

      <div className="flex items-center justify-between gap-space-sm">
        <span className="font-label-code text-label-code text-ink-muted">
          First detected {formatTime(group.firstDetected)} &middot; Last observed {formatTime(group.lastObserved)}
        </span>
        <span className="font-label-code text-label-code font-semibold text-primary-civic-deep group-hover:text-primary-civic-active shrink-0">
          View Issue &rarr;
        </span>
      </div>
    </Link>
  );
}
