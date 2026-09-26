import { Link, useParams } from "react-router-dom";
import { Bus, Clock, FileSearch, Flag, MapPin, ScanEye, ShieldCheck, Workflow } from "lucide-react";
import { EmptyState, MetaStrip, PageHeader, Panel, PanelHeader, SeverityBadge, SourceBadge, StatusBadge } from "../../components/ui";
import { DetectionPlayer } from "../../components/ai";
import { PriorityScoreBars } from "../../components/events";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, issueService, mediaService, routeService } from "../../services";
import { computePriorityBreakdown } from "../../lib/priorityScore";
import { issueMarker } from "../../lib/mapMarkers";
import { issueStatusMeta } from "../../lib/status";
import { categoryVisual } from "../../lib/visuals";
import { cn } from "../../lib/cn";

function formatDateTime(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function clock(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Issue detail — evidence first: the detection frames from every bus that
// saw it, then where it is, how it was corroborated, and why it ranks.
export function IssueIntelligence() {
  const { issueId } = useParams<{ issueId: string }>();
  const { data: issue, loading } = useAsyncData(() => issueService.getIssueById(issueId ?? ""), [issueId]);
  const { data: relatedEvents } = useAsyncData(() => eventService.listEventsByIds(issue?.relatedEventIds ?? []), [issue]);
  const { data: clips } = useAsyncData(() => mediaService.listDetectionClipsForEvents(issue?.relatedEventIds ?? []), [issue]);
  const { data: cameras } = useAsyncData(() => fleetService.listCameras(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);

  if (!loading && !issue) {
    return (
      <>
        <PageHeader title="Issue not found" back={{ to: "/road-issues", label: "Road Issues" }} />
        <Panel>
          <EmptyState icon={FileSearch} title={`No issue with ID "${issueId}"`} hint="It may have been resolved or the link is out of date." />
        </Panel>
      </>
    );
  }

  const chronological = [...(relatedEvents ?? [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const routeNames = Object.fromEntries((routes ?? []).map((r) => [r.routeId, `${r.origin} → ${r.destination}`]));
  const corroborated = (issue?.observingBuses.length ?? 0) > 1;

  return (
    <>
      <PageHeader
        back={{ to: "/road-issues", label: "Road Issues" }}
        title={issue ? categoryVisual(issue.subtype).label : "Loading…"}
        context={
          issue && (
            <>
              <span>{issue.issueId}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} aria-hidden="true" />
                {issue.location}
              </span>
            </>
          )
        }
        actions={
          issue && (
            <>
              <SeverityBadge severity={issue.severity} />
              <StatusBadge tone={issueStatusMeta(issue.status).tone}>{issueStatusMeta(issue.status).label}</StatusBadge>
              <StatusBadge tone={corroborated ? "ok" : "neutral"} icon={corroborated ? ShieldCheck : undefined}>
                {corroborated ? `Corroborated by ${issue.observingBuses.length} buses` : "Single observation"}
              </StatusBadge>
            </>
          )
        }
      />

      {issue && (
        <>
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Panel as="section" className="xl:col-span-7 p-4" aria-label="Evidence">
              <DetectionPlayer clips={clips ?? []} routeNames={routeNames} cameras={cameras ?? []} />
            </Panel>
            <GISMap
              className="xl:col-span-5 h-[380px] xl:h-auto xl:min-h-[420px]"
              ariaLabel={`Location of ${issue.issueId}`}
              markers={[issueMarker(issue)]}
              routeLines={networkRouteLines ?? []}
              fitToMarkers
              showLayerPanel={false}
            />
          </section>

          <Panel className="p-4">
            <MetaStrip
              items={[
                { label: "First seen", value: formatDateTime(issue.firstSeen), icon: Clock },
                { label: "Last seen", value: formatDateTime(issue.lastSeen), icon: Clock },
                { label: "Observations", value: issue.observationCount, icon: ScanEye },
                { label: "Fused confidence", value: `${issue.confidence}%`, icon: ShieldCheck },
                { label: "Coordinates", value: `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`, icon: MapPin },
                { label: "Evidence records", value: `${issue.evidence.length} · ${issue.evidence.filter((e) => e.piiRedacted).length} PII-redacted` },
              ]}
            />
          </Panel>

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Panel as="section" className="xl:col-span-7 p-4 flex flex-col gap-3">
              <PanelHeader title="How it was corroborated" icon={Workflow} />
              <ol className="flex flex-col">
                {chronological.map((event, i) => (
                  <li key={event.eventId} className="grid grid-cols-[72px_20px_1fr] gap-x-2">
                    <time dateTime={event.timestamp} className="text-meta text-ink-3 tabular-nums pt-2.5">
                      {clock(event.timestamp)}
                    </time>
                    <span className="relative flex justify-center" aria-hidden="true">
                      {i < chronological.length - 1 && <span className="absolute top-5 bottom-0 w-px bg-line" />}
                      <span className="relative mt-3.5 h-2.5 w-2.5 rounded-full bg-action ring-4 ring-surface" />
                    </span>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <Link to={`/fleet/${event.busId}`} className="inline-flex items-center gap-1.5 text-item text-ink hover:text-action">
                        <Bus size={14} aria-hidden="true" />
                        {event.busId}
                      </Link>
                      <span className="text-meta text-ink-3">{event.routeId.replace("BEST-", "Route ")}</span>
                      <span className={cn("text-meta tabular-nums", i > 0 && event.confidence > chronological[i - 1].confidence ? "text-ok-ink" : "text-ink-2")}>
                        {event.confidence}%
                      </span>
                    </div>
                  </li>
                ))}
                <li className="grid grid-cols-[72px_20px_1fr] gap-x-2">
                  <span />
                  <span className="flex justify-center" aria-hidden="true">
                    <span className="mt-3 h-3 w-3 rounded-full bg-ok ring-4 ring-ok-soft" />
                  </span>
                  <p className="py-2 text-item text-ok-ink">
                    {corroborated ? `Fused into one issue from ${issue.observingBuses.length} buses` : "Single sighting · awaiting a second bus"}
                  </p>
                </li>
              </ol>
            </Panel>

            <Panel as="section" className="xl:col-span-5 p-4 flex flex-col gap-3">
              <PanelHeader title="Priority" icon={Flag} actions={<SourceBadge source="demo" />} />
              <PriorityScoreBars breakdown={computePriorityBreakdown(issue)} />
              <p className="text-micro text-ink-3">Illustrative weighting of real issue fields, not an official scoring model.</p>
            </Panel>
          </section>
        </>
      )}
    </>
  );
}
