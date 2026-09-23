import { Link } from "react-router-dom";
import { PanelHeader } from "../ui";
import { formatMinutesAgo, minutesAgo } from "../../lib/timeAgo";
import type { Issue, Severity } from "../../types";

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_TEXT: Record<Severity, string> = {
  critical: "text-signal-alert",
  high: "text-transit-warning",
  medium: "text-transit-ochre",
  low: "text-ink-muted",
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-signal-alert",
  high: "bg-transit-warning",
  medium: "bg-transit-ochre",
  low: "bg-ink-muted",
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

interface NeedsAttentionPanelProps {
  issues: Issue[];
  /** Latest timestamp across the fixture set, standing in for "now" — see
   * lib/timeAgo.ts's doc comment for why this isn't the real wall clock. */
  anchor: string;
  limit?: number;
}

// Operational answer to "what does the transport authority need to look at
// right now" — ranked by severity, each row naming the problem, the
// corroboration behind it, and how recently it was last observed.
export function NeedsAttentionPanel({ issues, anchor, limit = 4 }: NeedsAttentionPanelProps) {
  const visible = issues.slice(0, limit);

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm h-full flex flex-col gap-space-sm">
      <PanelHeader title="Needs Attention" icon="priority_high" meta={<span className="font-label-code text-label-code text-ink-muted">{issues.length} open</span>} />
      <div className="flex flex-col divide-y divide-border-slate">
        {visible.map((issue) => (
          <Link
            key={issue.issueId}
            to={`/road-issues/${issue.issueId}`}
            className="flex items-start gap-space-sm py-space-sm group"
          >
            <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[issue.severity]}`} />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className={`font-label-eyebrow text-label-eyebrow uppercase font-bold ${SEVERITY_TEXT[issue.severity]}`}>
                {SEVERITY_LABEL[issue.severity]}
              </span>
              <span className="font-title-sm text-title-sm text-ink-primary font-semibold capitalize truncate">
                {titleCase(issue.subtype)} &mdash; {issue.location}
              </span>
              <span className="font-body-sm text-body-sm text-ink-muted">
                {issue.observingBuses.length} bus{issue.observingBuses.length === 1 ? "" : "es"} &middot;{" "}
                {issue.observationCount} observation{issue.observationCount === 1 ? "" : "s"}
              </span>
            </div>
            <span className="font-label-code text-label-code text-ink-muted shrink-0 whitespace-nowrap">
              {formatMinutesAgo(minutesAgo(issue.lastSeen, anchor))}
            </span>
          </Link>
        ))}
        {visible.length === 0 && (
          <span className="py-space-md font-body-sm text-body-sm text-ink-muted">Nothing needs attention right now.</span>
        )}
      </div>
    </div>
  );
}
