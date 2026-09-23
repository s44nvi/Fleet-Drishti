import { Link } from "react-router-dom";
import { IssueCard } from "./IssueCard";
import type { Issue } from "../../types";

interface PriorityQueuePanelProps {
  issues: Issue[];
  limit?: number;
}

export function PriorityQueuePanel({ issues, limit = 3 }: PriorityQueuePanelProps) {
  const visible = issues.slice(0, limit);

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm flex flex-col shadow-sm h-full">
      <div className="flex items-center justify-between pb-space-sm border-b border-border-slate">
        <span className="font-title-sm text-title-sm text-ink-primary font-bold">Priority Issues</span>
        <span className="font-label-code text-label-code text-ink-muted">{issues.length} awaiting action</span>
      </div>

      <div className="flex flex-col divide-y divide-border-slate">
        {visible.map((issue) => (
          <IssueCard key={issue.issueId} issue={issue} />
        ))}
        {visible.length === 0 && (
          <span className="py-space-md font-body-sm text-body-sm text-ink-muted">No priority issues right now.</span>
        )}
      </div>

      <Link
        to="/priority-queue"
        className="mt-space-sm font-label-code text-label-code font-semibold text-primary-civic-deep hover:text-primary-civic-active self-end"
      >
        View priority queue &rarr;
      </Link>
    </div>
  );
}
