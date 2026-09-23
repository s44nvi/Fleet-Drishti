import { Link } from "react-router-dom";
import { SeverityBadge, StatusBadge } from "../ui";
import { CentralAlertBadge } from "./CentralAlertBadge";
import type { Issue, SafetyEvent } from "../../types";

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

interface PedestrianRiskCardProps {
  event: SafetyEvent;
  /** The fused Issue this signal escalated into, if any — most
   * SafetyEvents are single-bus ambient monitoring signals with no Issue
   * counterpart yet, so this (and everything it unlocks: observation
   * count, workflow status, corroboration, a detail-page link) is optional. */
  matchedIssue?: Issue;
}

// PS §"vulnerable pedestrian situations such as school children crossing
// roads". The current fixtures only support "pedestrian-conflict" /
// "crossing-risk" / "near-miss" — this labels each event by its actual
// recorded type rather than implying a school/child-specific classifier
// exists (see lib/taxonomy.ts's SAFETY_EVENT_CATEGORIES doc comment for the
// same distinction at the filter level).
export function PedestrianRiskCard({ event, matchedIssue }: PedestrianRiskCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-title-sm text-title-sm text-ink-primary font-bold truncate">{titleCase(event.type)}</span>
          <span className="font-body-sm text-body-sm text-ink-muted truncate">{event.location}</span>
        </div>
        <SeverityBadge severity={event.severity} className="shrink-0" />
      </div>

      <div className="flex flex-wrap items-center gap-x-space-md gap-y-0.5 font-label-code text-label-code text-ink-secondary">
        <span>{event.confidence}% confidence</span>
        <span>Bus {event.busId}</span>
        <span>{new Date(event.observedAt).toLocaleTimeString("en-IN")}</span>
        <span>
          GPS {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-space-sm pt-space-xs border-t border-border-slate">
        {matchedIssue ? (
          <>
            <span className="font-label-code text-label-code text-ink-secondary">
              {matchedIssue.observationCount} observation{matchedIssue.observationCount === 1 ? "" : "s"} &middot;{" "}
              {matchedIssue.observingBuses.length} bus{matchedIssue.observingBuses.length === 1 ? "" : "es"}
            </span>
            <CentralAlertBadge status={matchedIssue.status} />
          </>
        ) : (
          <StatusBadge tone="low">Single Observation &middot; Continuous Monitoring</StatusBadge>
        )}
      </div>
    </>
  );

  const className = "bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm flex flex-col gap-space-xs";

  if (matchedIssue) {
    return (
      <Link to={`/road-issues/${matchedIssue.issueId}`} className={`${className} hover:bg-surface-container-high transition-colors`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
