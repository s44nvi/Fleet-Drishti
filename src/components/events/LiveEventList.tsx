import { useEffect, useRef } from "react";
import { Radio } from "lucide-react";
import { Panel, PanelHeader, SeverityBadge, SourceBadge, EmptyState } from "../ui";
import { ObservationRow } from "./ObservationRow";
import { cn } from "../../lib/cn";
import { categoryVisual } from "../../lib/visuals";
import { formatMinutesAgo, minutesAgo } from "../../lib/timeAgo";
import type { Event } from "../../types";

interface LiveEventListProps {
  events: Event[];
  anchor: string;
  selectedEventId?: string | null;
  onSelect?: (event: Event) => void;
  onHover?: (event: Event | null) => void;
  className?: string;
}

// Newest validated observations first. Selecting one drives the map and the
// DetectionPlayer; the timestamps are relative to the dataset anchor.
export function LiveEventList({ events, anchor, selectedEventId, onSelect, onHover, className }: LiveEventListProps) {
  const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!selectedEventId) return;
    listRef.current?.querySelector(`[data-event-id="${CSS.escape(selectedEventId)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedEventId]);

  return (
    <Panel as="section" className={cn("flex flex-col min-h-0", className)}>
      <PanelHeader
        className="px-4 pt-4 pb-2"
        title="Latest events"
        icon={Radio}
        meta={`${sorted.length}`}
        actions={<SourceBadge source="simulated" />}
      />
      {sorted.length === 0 ? (
        <EmptyState compact title="No events yet" />
      ) : (
        <ul ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          {sorted.map((event) => (
            <li key={event.eventId} data-event-id={event.eventId}>
              <ObservationRow
                category={event.subtype}
                title={categoryVisual(event.subtype).label}
                meta={
                  <>
                    <span className="truncate">{event.location}</span>
                    <span className="text-ink-3">{event.busId}</span>
                  </>
                }
                aside={
                  <>
                    <span className="tabular-nums">{formatMinutesAgo(minutesAgo(event.timestamp, anchor))}</span>
                    <SeverityBadge severity={event.severity} />
                  </>
                }
                selected={event.eventId === selectedEventId}
                onSelect={onSelect ? () => onSelect(event) : undefined}
                onHover={onHover ? (h) => onHover(h ? event : null) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
