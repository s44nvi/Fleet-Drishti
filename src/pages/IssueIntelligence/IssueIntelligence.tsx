import { Link, useParams } from "react-router-dom";
import { PageHeader, Panel, PanelHeader, SeverityBadge, StatusBadge } from "../../components/ui";
import { TelemetryRow } from "../../components/telemetry";
import { EvidencePanel } from "../../components/ai";
import { PriorityScoreBars } from "../../components/events";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, issueService } from "../../services";
import { computePriorityBreakdown } from "../../lib/priorityScore";
import type { BadgeTone, Issue, MapMarker } from "../../types";

const STATUS_TONE: Record<Issue["status"], BadgeTone> = {
  new: "info",
  "under-review": "info",
  "action-required": "critical",
  resolved: "success",
};

// Every other timestamp in the app renders via toLocaleTimeString("en-IN")
// (time only — the fixtures share one day, so a bare date adds no
// information). First/Last Seen are the exception that needs a date too,
// so this spells it out explicitly (e.g. "12 Sep 2026, 10:40:02 am")
// instead of the ambiguous numeric "12/9/2026" toLocaleString("en-IN")
// previously produced.
function formatDateTime(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function IssueIntelligence() {
  const { issueId } = useParams<{ issueId: string }>();
  const { data: issue, loading } = useAsyncData(() => issueService.getIssueById(issueId ?? ""), [issueId]);
  const { data: relatedEvents } = useAsyncData(
    () => eventService.listEventsByIds(issue?.relatedEventIds ?? []),
    [issue],
  );

  if (!loading && !issue) {
    return (
      <>
        <PageHeader eyebrow="Intelligence" title="Issue Intelligence" description="Deep-dive detail view for a single reported road issue." />
        <Panel className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">
          No issue found for ID "{issueId}".
        </Panel>
      </>
    );
  }

  const chronologicalEvents = [...(relatedEvents ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const confidenceTrend = chronologicalEvents.map((event) => event.confidence).join("% → ") + "%";
  const priorityBreakdown = issue ? computePriorityBreakdown(issue) : undefined;
  const corroborated = (issue?.observationCount ?? 0) > 1;
  const mapMarkers: MapMarker[] = issue
    ? [
        {
          id: issue.issueId,
          kind: "critical-distress",
          label: `${issue.issueId} · ${issue.location}`,
          latitude: issue.latitude,
          longitude: issue.longitude,
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title={issue ? issue.issueId : "Issue Intelligence"}
        description={issue ? `${issue.subtype.replace(/-/g, " ")} at ${issue.location}` : "Loading issue detail…"}
        actions={
          issue && (
            <div className="flex items-center gap-space-xs">
              <SeverityBadge severity={issue.severity} />
              <StatusBadge tone={corroborated ? "live" : "low"}>
                {corroborated ? "Corroborated" : "Single Observation"}
              </StatusBadge>
              <a
                href="#evidence"
                className="font-label-code text-label-code font-semibold text-primary-civic-deep hover:text-primary-civic-active"
              >
                View Evidence &darr;
              </a>
            </div>
          )
        }
      />

      {issue && (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md w-full items-start">
          <div className="xl:col-span-5 flex flex-col gap-space-md">
            <Panel className="p-space-sm flex flex-col gap-space-xs">
              <PanelHeader title="Issue Telemetry" icon="fact_check" />
              <TelemetryRow label="Status" value={<StatusBadge tone={STATUS_TONE[issue.status]}>{issue.status.replace(/-/g, " ")}</StatusBadge>} />
              <TelemetryRow label="Type" value={issue.type.replace(/-/g, " ")} />
              <TelemetryRow label="Confidence" value={`${issue.confidence}%`} />
              <TelemetryRow label="Coordinates" value={`${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`} />
              <TelemetryRow label="First Seen" value={formatDateTime(issue.firstSeen)} />
              <TelemetryRow label="Last Seen" value={formatDateTime(issue.lastSeen)} />
              <TelemetryRow label="Observation Count" value={issue.observationCount} />
              {chronologicalEvents.length > 1 && (
                <TelemetryRow label="Observation Confidence" value={confidenceTrend} />
              )}
            </Panel>

            {priorityBreakdown && (
              <Panel className="p-space-sm flex flex-col gap-space-xs">
                <PanelHeader title="Priority" icon="flag" />
                <PriorityScoreBars breakdown={priorityBreakdown} />
              </Panel>
            )}

            <Panel className="p-space-sm flex flex-col gap-space-sm">
              <PanelHeader title="Map Location" icon="location_on" />
              <div className="h-[200px]">
                <GISMap markers={mapMarkers} title={issue.location} />
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-7">
            <Panel className="p-space-sm flex flex-col gap-space-sm">
              <PanelHeader title="Observing Buses" icon="directions_bus" meta={<span className="font-label-code text-label-code text-ink-muted">Multi-bus observation fusion</span>} />
              <div className="flex flex-wrap gap-space-xs">
                {issue.observingBuses.map((busId) => (
                  <Link
                    key={busId}
                    to={`/fleet/${busId}`}
                    className="inline-flex items-center gap-1.5 rounded font-label-code text-label-code font-semibold px-space-sm py-1 bg-surface-panel border border-border-slate text-ink-primary hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">directions_bus</span>
                    {busId}
                  </Link>
                ))}
              </div>

              <PanelHeader title="Observation History" icon="bolt" className="pt-space-sm" />
              <div className="flex flex-col gap-space-xs">
                {chronologicalEvents.map((event) => (
                  <div key={event.eventId} className="flex items-center justify-between border border-border-slate rounded px-space-sm py-1.5">
                    <span className="font-label-code text-label-code text-ink-primary">{event.eventId}</span>
                    <span className="font-label-code text-label-code text-ink-secondary">{event.busId} &bull; {event.confidence}%</span>
                    <span className="font-label-code text-label-code text-ink-muted">
                      {new Date(event.timestamp).toLocaleTimeString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div id="evidence" className="xl:col-span-12">
            <Panel className="p-space-sm flex flex-col gap-space-sm">
              <PanelHeader title="Evidence" icon="photo_library" />
              <EvidencePanel evidence={issue.evidence} />
            </Panel>
          </div>
        </section>
      )}
    </>
  );
}
