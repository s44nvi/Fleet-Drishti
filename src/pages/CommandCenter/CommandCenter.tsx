import { KpiStrip, EventActivityChart, DetectionDistributionChart } from "../../components/telemetry";
import { GISMap } from "../../components/gis";
import {
  EventFeed,
  PriorityQueuePanel,
  CorrelationPanel,
  TopHotspotsPanel,
  NeedsAttentionPanel,
} from "../../components/events";
import { LiveAIObservationPanel } from "../../components/ai";
import { useAsyncData } from "../../hooks/useAsyncData";
import { analyticsService, eventService, fleetService, issueService, routeService } from "../../services";
import { congestionToIntensity } from "../../lib/congestion";
import type { MapMarker } from "../../types";

// Command Center: a centralized urban intelligence platform, not a
// map-first GIS viewer. Section order deliberately answers, top to bottom:
// WHAT is happening (KPIs) -> HOW MUCH / of WHAT TYPE (activity + detection
// analytics) -> WHERE it's concentrated + WHAT needs action (hotspots +
// attention queue) -> the live evidence feed and a compact spatial view.
// The full GIS workspace lives on Live Map; this page's map is a small
// situational-awareness tile, not the dominant element.
export function CommandCenter() {
  const { data: kpis } = useAsyncData(() => analyticsService.getCommandCenterKpis(), []);
  const { data: eventActivity } = useAsyncData(() => analyticsService.getEventActivityTrend(), []);
  const { data: detectionDistribution } = useAsyncData(() => analyticsService.getDetectionDistribution(), []);
  const { data: buses } = useAsyncData(() => fleetService.listBuses(), []);
  const { data: issues } = useAsyncData(() => issueService.listIssues(), []);
  const { data: priorityIssues } = useAsyncData(() => issueService.listPriorityIssues(), []);
  const { data: topHotspots } = useAsyncData(() => issueService.listTopHotspots(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const { data: trafficHotspots } = useAsyncData(() => issueService.listTrafficHotspots(), []);
  const { data: safetyEvents } = useAsyncData(() => issueService.listSafetyEvents(), []);
  const { data: infrastructureIssues } = useAsyncData(() => issueService.listInfrastructureIssues(), []);
  const { data: networkStops } = useAsyncData(() => routeService.listNetworkStops(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);

  // --- WHAT IS THE EVIDENCE: most recent event, its source bus, and the
  // raw Detection it was promoted from (used to annotate the demo frame) ---
  const mostRecentEvent = [...(events ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0];
  const { data: mostRecentDetection } = useAsyncData(
    () => (mostRecentEvent ? eventService.getDetectionForEvent(mostRecentEvent.eventId) : Promise.resolve(undefined)),
    [mostRecentEvent?.eventId],
  );

  // Stand-in for "now" — see lib/timeAgo.ts. Falls back to the current wall
  // clock only if there are no events at all yet.
  const anchor = mostRecentEvent?.timestamp ?? new Date().toISOString();

  // --- WHERE: map markers across every observation type, using each
  // domain object's real latitude/longitude directly (no screen projection) ---
  const busMarkers: MapMarker[] = (buses ?? []).map((bus) => ({
    id: bus.busId,
    kind: "bus-probe",
    label: `${bus.label} · Route ${bus.routeId.replace("BEST-", "")}`,
    latitude: bus.location.latitude,
    longitude: bus.location.longitude,
    href: `/fleet/${bus.busId}`,
  }));
  const issueMarkers: MapMarker[] = (issues ?? []).map((issue) => ({
    id: issue.issueId,
    kind: "critical-distress",
    label: `${issue.issueId} · ${issue.location}`,
    latitude: issue.latitude,
    longitude: issue.longitude,
    href: `/road-issues/${issue.issueId}`,
  }));
  const trafficMarkers: MapMarker[] = (trafficHotspots ?? []).map((hotspot) => ({
    id: hotspot.hotspotId,
    kind: "traffic-chokepoint",
    label: `${hotspot.location} · ${hotspot.congestionLevel}`,
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    intensity: congestionToIntensity(hotspot.congestionLevel),
  }));
  const safetyMarkers: MapMarker[] = (safetyEvents ?? []).map((event) => ({
    id: event.safetyEventId,
    kind: "vulnerable-crossing",
    label: `${event.location} · ${event.type.replace(/-/g, " ")}`,
    latitude: event.latitude,
    longitude: event.longitude,
    intensity: event.severity,
  }));
  const infrastructureMarkers: MapMarker[] = (infrastructureIssues ?? []).map((item) => ({
    id: item.infrastructureIssueId,
    kind: "infrastructure-asset",
    label: `${item.location} · ${item.assetType.replace(/-/g, " ")}`,
    latitude: item.latitude,
    longitude: item.longitude,
  }));

  const observingBus = (buses ?? []).find((bus) => bus.busId === mostRecentEvent?.busId);
  const relatedIssue = mostRecentEvent
    ? (issues ?? []).find((issue) => issue.relatedEventIds.includes(mostRecentEvent.eventId))
    : undefined;

  // --- Correlation case study: the issue with the strongest multi-bus fusion ---
  const strongestCorrelation = [...(issues ?? [])].sort((a, b) => b.observationCount - a.observationCount)[0];

  return (
    // Own tighter gap (overrides AppShell's shared gap-space-lg, which is
    // sized for sparser pages) — keeps this content-dense page within
    // roughly 1-2 viewport heights without dropping any section.
    <div className="flex flex-col w-full gap-space-sm">
      <KpiStrip tiles={kpis ?? []} />

      {/* HOW MUCH, WHAT TYPE: activity trend + detection taxonomy */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-sm w-full items-stretch">
        <EventActivityChart days={eventActivity ?? []} />
        <DetectionDistributionChart buckets={detectionDistribution ?? []} />
      </section>

      {/* WHERE it's concentrated, WHAT needs attention right now */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-sm w-full items-stretch">
        <TopHotspotsPanel hotspots={topHotspots ?? []} />
        <NeedsAttentionPanel issues={priorityIssues ?? []} anchor={anchor} />
      </section>

      {/* Live evidence feed alongside a compact spatial overview. An even
          column split (rather than feed-dominant) gives the map's layer
          legend room to sit on one row so the canvas beneath it isn't
          squeezed down to a sliver — the full GIS workspace still lives on
          Live Map, so this tile stays modest, just not cramped. */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-sm w-full items-stretch h-[440px]">
        <EventFeed events={events ?? []} issues={issues ?? []} />
        <GISMap
          markers={[...infrastructureMarkers, ...trafficMarkers, ...safetyMarkers, ...issueMarkers, ...busMarkers]}
          stops={networkStops ?? []}
          routeLines={networkRouteLines ?? []}
          title="Situational Overview"
        />
      </section>

      {/* HOW the intelligence gets here: sensing pipeline + a worked
          multi-bus correlation example */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-sm w-full items-stretch">
        <div className="xl:col-span-7">
          <LiveAIObservationPanel
            bus={observingBus}
            event={mostRecentEvent}
            detection={mostRecentDetection}
            eventLinkTo={relatedIssue ? `/road-issues/${relatedIssue.issueId}` : mostRecentEvent ? `/fleet/${mostRecentEvent.busId}` : undefined}
          />
        </div>
        <div className="xl:col-span-5">
          <CorrelationPanel issue={strongestCorrelation} />
        </div>
      </section>

      {/* WHAT action can be taken */}
      <PriorityQueuePanel issues={priorityIssues ?? []} />
    </div>
  );
}
