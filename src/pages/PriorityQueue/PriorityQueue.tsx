import { Bus, ListOrdered } from "lucide-react";
import { EmptyState, PageHeader, Panel, SeverityBadge, SourceBadge, StatusBadge } from "../../components/ui";
import { ObservationRow } from "../../components/events";
import { useAsyncData } from "../../hooks/useAsyncData";
import { issueService } from "../../services";
import { computePriorityBreakdown } from "../../lib/priorityScore";
import { ISSUE_STATUS } from "../../lib/status";
import { categoryVisual } from "../../lib/visuals";

// Action queue: open issues ranked by the explainable demo priority score.
export function PriorityQueue() {
  const { data: issues, loading } = useAsyncData(() => issueService.listIssues(), []);
  const ranked = (issues ?? [])
    .filter((issue) => issue.status !== "resolved")
    .map((issue) => ({ issue, score: computePriorityBreakdown(issue).score }))
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <PageHeader
        title="Action queue"
        context={
          <>
            <span>Open issues by priority</span>
            <SourceBadge source="demo" detail="scoring model" />
          </>
        }
      />
      <Panel className="p-2">
        {loading ? (
          <p className="p-6 text-body text-ink-3">Loading queue…</p>
        ) : ranked.length === 0 ? (
          <EmptyState icon={ListOrdered} title="Nothing waiting for action" />
        ) : (
          <ol>
            {ranked.map(({ issue, score }) => (
              <li key={issue.issueId}>
                <ObservationRow
                  category={issue.subtype}
                  title={categoryVisual(issue.subtype).label}
                  meta={
                    <>
                      <span className="truncate max-w-[40ch]">{issue.location}</span>
                      <span className="inline-flex items-center gap-1">
                        <Bus size={12} aria-hidden="true" />
                        {issue.observingBuses.length}
                      </span>
                      <StatusBadge tone={ISSUE_STATUS[issue.status].tone}>{ISSUE_STATUS[issue.status].label}</StatusBadge>
                    </>
                  }
                  aside={
                    <>
                      <span className="text-title text-ink tabular-nums" aria-label={`Priority ${score}`}>
                        {score}
                      </span>
                      <SeverityBadge severity={issue.severity} />
                    </>
                  }
                  href={`/road-issues/${issue.issueId}`}
                />
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}
