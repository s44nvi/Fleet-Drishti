import { Bus, CarFront, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Panel, SeverityBadge, SourceBadge } from "../ui";
import { DetectionThumb } from "../ai";
import { cn } from "../../lib/cn";
import { formatMinutesAgo, minutesAgo } from "../../lib/timeAgo";
import type { DetectionClip, Severity } from "../../types";

export interface TrafficObservation {
  id: string;
  title: string;
  location: string;
  busLabel: string;
  timestamp: string;
  severity: Severity;
  clip?: DetectionClip;
  href?: string;
}

// Most recent traffic observations made by buses. Named "latest", never
// "live": they are fixture records (SIMULATED).
export function TrafficObservations({ items, anchor, className }: { items: TrafficObservation[]; anchor: string; className?: string }) {
  return (
    <Panel as="section" className={cn("p-4 flex flex-col gap-3", className)} aria-label="Latest traffic observations">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-title text-ink">Latest observations</h2>
          <p className="text-meta text-ink-3">Traffic seen by the bus fleet</p>
        </div>
        <SourceBadge source="simulated" />
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {items.map((o) => {
          const body = (
            <>
              {o.clip ? (
                <DetectionThumb clip={o.clip} className="h-10 w-16" />
              ) : (
                <span className="h-10 w-16 shrink-0 inline-flex items-center justify-center rounded-md bg-surface-2 text-ink-3" aria-hidden="true">
                  <CarFront size={17} strokeWidth={1.75} />
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-item text-ink truncate">{o.title}</span>
                  <span className="text-micro text-ink-3 tabular-nums shrink-0">{formatMinutesAgo(minutesAgo(o.timestamp, anchor))}</span>
                </span>
                <span className="block text-meta text-ink-3 truncate" title={o.location}>
                  {o.location}
                </span>
                <span className="flex items-center justify-between gap-2 text-meta text-ink-3">
                  <span className="inline-flex items-center gap-1 min-w-0 truncate">
                    <Bus size={12} className="shrink-0" aria-hidden="true" />
                    {o.busLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <SeverityBadge severity={o.severity} />
                    {o.href && <ChevronRight size={14} aria-hidden="true" />}
                  </span>
                </span>
              </span>
            </>
          );
          return (
            <li key={o.id}>
              {o.href ? (
                <Link to={o.href} className="flex items-center gap-3 py-2.5 rounded-md hover:bg-surface-2">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
