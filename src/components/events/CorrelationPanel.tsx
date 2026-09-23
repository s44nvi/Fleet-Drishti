import { Link } from "react-router-dom";
import type { Issue } from "../../types";

// Visualizes the core differentiator: independent single-bus observations
// get correlated by Fleet Drishti into one persistent, verified Issue.
// Pass the Issue with the strongest multi-bus observation count to make
// this concrete rather than abstract.
export function CorrelationPanel({ issue }: { issue: Issue | undefined }) {
  if (!issue) {
    return (
      <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm h-full flex items-center justify-center">
        <span className="font-body-sm text-body-sm text-ink-muted">No correlated observations yet.</span>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm h-full flex flex-col gap-space-sm">
      <span className="font-title-sm text-title-sm text-ink-primary font-bold pb-space-sm border-b border-border-slate">
        Multi-Bus Correlation
      </span>

      <div className="flex flex-col items-center gap-space-xs py-space-sm text-center">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {issue.observingBuses.map((busId) => (
            <span
              key={busId}
              className="font-label-code text-label-code font-semibold px-space-sm py-1 rounded border border-border-slate bg-surface-panel text-ink-primary"
            >
              {busId}
            </span>
          ))}
        </div>
        <span className="font-body-sm text-body-sm text-ink-muted">
          {issue.observationCount} independent observation{issue.observationCount === 1 ? "" : "s"}
        </span>

        <span className="material-symbols-outlined text-ink-muted text-[18px]">arrow_downward</span>

        <span className="font-label-eyebrow text-label-eyebrow text-ink-muted uppercase tracking-widest">
          Fleet Drishti Correlation
        </span>

        <span className="material-symbols-outlined text-ink-muted text-[18px]">arrow_downward</span>

        <Link to={`/road-issues/${issue.issueId}`} className="flex flex-col items-center gap-0.5 group">
          <span className="font-headline-md text-headline-md text-primary-civic-deep group-hover:text-primary-civic-active font-bold tracking-tight">
            One Verified Issue
          </span>
          <span className="font-body-sm text-body-sm text-ink-secondary capitalize">
            {issue.subtype.replace(/-/g, " ")} &middot; {issue.location}
          </span>
        </Link>
      </div>
    </div>
  );
}
