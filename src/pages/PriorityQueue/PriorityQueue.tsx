import { PageHeader, Panel } from "../../components/ui";
import { IssueCard } from "../../components/events";
import { useAsyncData } from "../../hooks/useAsyncData";
import { issueService } from "../../services";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export function PriorityQueue() {
  const { data: issues, loading } = useAsyncData(() => issueService.listIssues(), []);
  const sorted = [...(issues ?? [])].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const actionable = sorted.filter((issue) => issue.status !== "resolved");

  return (
    <>
      <PageHeader
        eyebrow="Action"
        title="Government Action Queue"
        description="Prioritized queue of detected events awaiting government action."
      />
      <Panel className="p-space-sm">
        {loading ? (
          <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading priority queue…</div>
        ) : (
          <div className="flex flex-col divide-y divide-border-slate">
            {actionable.map((issue) => (
              <IssueCard key={issue.issueId} issue={issue} />
            ))}
            {actionable.length === 0 && (
              <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">No issues in the queue.</div>
            )}
          </div>
        )}
      </Panel>
    </>
  );
}
