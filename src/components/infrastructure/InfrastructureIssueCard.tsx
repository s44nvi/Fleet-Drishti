import { StatusBadge } from "../ui";
import { infrastructureCategoryForAssetType } from "../../lib/taxonomy";
import type { BadgeTone, InfrastructureIssue, Severity } from "../../types";

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical Priority",
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};
const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-signal-alert",
  high: "bg-transit-warning",
  medium: "bg-transit-ochre",
  low: "bg-ink-muted",
};
const SEVERITY_TEXT: Record<Severity, string> = {
  critical: "text-signal-alert",
  high: "text-transit-warning",
  medium: "text-transit-ochre",
  low: "text-ink-muted",
};
const STATUS_TONE: Record<InfrastructureIssue["status"], BadgeTone> = {
  new: "info",
  "under-review": "info",
  "action-required": "critical",
  resolved: "success",
};

// Mirrors IssueCard's visual pattern (severity dot + label, status badge,
// link affordance) but for the InfrastructureIssue fixture domain, which
// has no confidence/observationCount/observingBuses/priority-score fields —
// unlike a fused Issue, so this never fabricates those. Every current
// record is a single asset-condition observation with no multi-bus
// corroboration model behind it yet, made explicit via the badge below
// rather than omitted silently.
export function InfrastructureIssueCard({ item }: { item: InfrastructureIssue }) {
  const category = infrastructureCategoryForAssetType(item.assetType);

  return (
    <a href="#infrastructure-map" className="flex items-center justify-between gap-space-md py-space-sm group">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-title-sm text-title-sm text-ink-primary font-semibold capitalize">
          {item.assetType.replace(/-/g, " ")} &mdash; {item.condition}
        </span>
        <span className="font-body-sm text-body-sm text-ink-muted truncate">{item.location}</span>
        <span className="font-label-code text-label-code flex items-center gap-1.5 flex-wrap">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[item.severity]}`} />
          <span className={`font-semibold ${SEVERITY_TEXT[item.severity]}`}>{SEVERITY_LABEL[item.severity]}</span>
          <span className="text-ink-secondary">&middot; {category}</span>
          <span className="text-ink-muted">&middot; Single Observation</span>
        </span>
      </div>
      <div className="flex items-center gap-space-sm shrink-0">
        <StatusBadge tone={STATUS_TONE[item.status]}>{item.status.replace(/-/g, " ")}</StatusBadge>
        <span className="font-label-code text-label-code font-semibold text-primary-civic-deep group-hover:text-primary-civic-active whitespace-nowrap">
          View on Map &darr;
        </span>
      </div>
    </a>
  );
}
