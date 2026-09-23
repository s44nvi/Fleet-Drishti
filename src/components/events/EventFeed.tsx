import { IntelligenceCard } from "./IntelligenceCard";
import { groupEventsIntoIntelligence } from "../../lib/intelligenceGrouping";
import type { Event, Issue } from "../../types";

interface EventFeedProps {
  events: Event[];
  issues: Issue[];
  limit?: number;
}

// Live Intelligence Feed — groups raw per-bus Events into one corroborated
// card per real-world problem (same subtype+location, or the Issue they've
// already been fused into) instead of listing every observation as an
// unrelated row. See lib/intelligenceGrouping.ts.
export function EventFeed({ events, issues, limit = 4 }: EventFeedProps) {
  const groups = groupEventsIntoIntelligence(events, issues).slice(0, limit);

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm flex flex-col shadow-sm h-full">
      <span className="font-title-sm text-title-sm text-ink-primary font-bold pb-space-sm border-b border-border-slate">
        Live Intelligence Feed
      </span>
      <div className="flex flex-col divide-y divide-border-slate">
        {groups.map((group) => (
          <IntelligenceCard key={group.key} group={group} />
        ))}
        {groups.length === 0 && (
          <span className="py-space-md font-body-sm text-body-sm text-ink-muted">No observations yet.</span>
        )}
      </div>
    </div>
  );
}
