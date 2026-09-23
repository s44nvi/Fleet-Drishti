import { useState } from "react";
import { Link } from "react-router-dom";
import { PriorityScoreBars } from "./PriorityScoreBars";
import { computePriorityBreakdown } from "../../lib/priorityScore";
import type { Issue, Severity } from "../../types";

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical Priority",
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

// Semantic severity color only — never the brand civic green.
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

// A fused, multi-bus-correlated Issue — one row per real-world problem,
// not per raw observation. Used in the Priority Issues section and the
// Government Action Queue page.
export function IssueCard({ issue }: { issue: Issue }) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = computePriorityBreakdown(issue);

  return (
    <div className="py-space-sm">
      <div className="flex items-center justify-between gap-space-md group">
        <Link to={`/road-issues/${issue.issueId}`} className="flex flex-col gap-0.5 min-w-0">
          <span className="font-title-sm text-title-sm text-ink-primary font-semibold capitalize">
            {issue.subtype.replace(/-/g, " ")}
          </span>
          <span className="font-body-sm text-body-sm text-ink-muted truncate">{issue.location}</span>
          <span className="font-label-code text-label-code flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[issue.severity]}`} />
            <span className={`font-semibold ${SEVERITY_TEXT[issue.severity]}`}>{SEVERITY_LABEL[issue.severity]}</span>
            <span className="text-ink-secondary">
              &middot; Observed by {issue.observationCount} bus{issue.observationCount === 1 ? "" : "es"}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-label-code text-label-code font-semibold text-ink-secondary hover:text-ink-primary flex items-center gap-0.5"
            aria-expanded={expanded}
          >
            Score {breakdown.score}
            <span className="material-symbols-outlined text-[16px]">{expanded ? "expand_less" : "expand_more"}</span>
          </button>
          <Link
            to={`/road-issues/${issue.issueId}`}
            className="font-label-code text-label-code font-semibold text-primary-civic-deep hover:text-primary-civic-active whitespace-nowrap"
          >
            Open Issue Intelligence &rarr;
          </Link>
        </div>
      </div>
      {expanded && <PriorityScoreBars breakdown={breakdown} />}
    </div>
  );
}
