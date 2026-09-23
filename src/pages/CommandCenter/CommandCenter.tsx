import { useMemo, useState } from "react";
import { AlertOctagon, Bus, FileWarning, MapPin, ScanEye } from "lucide-react";
import { PageHeader, Panel, SourceBadge } from "../../components/ui";
import { KpiStrip, CityPulse } from "../../components/telemetry";
import { GISMap } from "../../components/gis";
import { LiveEventList, TopLocations } from "../../components/events";
import { DetectionPlayer } from "../../components/ai";
import { useAsyncData } from "../../hooks/useAsyncData";
import { analyticsService, eventService, fleetService, issueService, mediaService, routeService } from "../../services";
import { groupEventsIntoIntelligence } from "../../lib/intelligenceGrouping";
import { isInfrastructureAssetInScope, isRoadDomainType } from "../../lib/taxonomy";
import { computeCityPulse, datasetAnchor } from "../../lib/pulse";
import {
  busMarker,
  infrastructureMarker,
  issueMarker,
  nearestMarker,
  observationGroupMarker,
  safetyMarker,
  trafficMarker,
} from "../../lib/mapMarkers";
import type { Hotspot } from "../../lib/hotspots";
import type { Event, KpiTile, MapMarker } from "../../types";

const KPI_VISUALS: Record<string, Pick<KpiTile, "icon" | "tone">> = {
  "buses-sensing": { icon: Bus, tone: "ok" },
  observations: { icon: ScanEye, tone: "action" },
  "open-issues": { icon: FileWarning, tone: "watch" },
  critical: { icon: AlertOctagon, tone: "alert" },
};

function formatAnchor(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Command Center: "What is happening across Mumbai right now?"
// Hierarchy: 4 KPIs → the city situation map (primary workspace) → the AI
// detection player (second visual) and latest events → city pulse and top
// locations. Selecting an event, marker or location keeps the map, the
// player and the lists in sync.
export function CommandCenter() {
  const { data: kpis } = useAsyncData(() => analyticsService.getCommandCenterKpis(), []);
  const { data: buses } = useAsyncData(() => fleetService.listBuses(), []);
  const { data: cameras } = useAsyncData(() => fleetService.listCameras(), []);
  const { data: issues } = useAsyncData(() => issueService.listIssues(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const { data: trafficHotspots } = useAsyncData(() => issueService.listTrafficHotspots(), []);
  const { data: safetyEvents } = useAsyncData(() => issueService.listSafetyEvents(), []);
  const { data: infrastructureIssues } = useAsyncData(() => issueService.listInfrastructureIssues(), []);
  const { data: topHotspots } = useAsyncData(() => issueService.listTopHotspots(), []);
  const { data: clips } = useAsyncData(() => mediaService.listDetectionClips(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);
  const { data: networkStops } = useAsyncData(() => routeService.listNetworkStops(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ latitude: number; longitude: number; key: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const allEvents = useMemo(() => events ?? [], [events]);
  const allIssues = useMemo(() => issues ?? [], [issues]);

  const anchor = useMemo(
    () =>
      datasetAnchor([
        ...allEvents.map((e) => e.timestamp),
        ...(safetyEvents ?? []).map((e) => e.observedAt),
        ...(buses ?? []).map((b) => b.lastSeenAt),
      ]),
    [allEvents, safetyEvents, buses],
  );

  const markers = useMemo<MapMarker[]>(() => {
    const roadIssues = allIssues.filter((issue) => isRoadDomainType(issue.type));
    const fusedIds = new Set(roadIssues.map((i) => i.issueId));
    const roadGroups = groupEventsIntoIntelligence(
      allEvents.filter((e) => isRoadDomainType(e.eventType)),
      roadIssues,
    ).filter((g) => !fusedIds.has(g.key));
    // Safety Issues are drawn through their underlying SafetyEvents
    // (below) so a fused pedestrian issue isn't pinned twice.
    const trafficIssues = allIssues.filter((issue) => issue.type === "traffic-blockage");
    return [
      ...(infrastructureIssues ?? []).filter((i) => isInfrastructureAssetInScope(i.assetType)).map(infrastructureMarker),
      ...(trafficHotspots ?? []).map((h) => trafficMarker(h, anchor)),
      ...trafficIssues.map((i) => issueMarker(i, anchor)),
      ...(safetyEvents ?? []).map((e) => safetyMarker(e, anchor)),
      ...roadGroups.map((g) => observationGroupMarker(g, anchor)),
      ...roadIssues.map((i) => issueMarker(i, anchor)),
      ...(buses ?? []).map(busMarker),
    ];
  }, [allIssues, allEvents, infrastructureIssues, trafficHotspots, safetyEvents, buses, anchor]);

  const observationMarkers = useMemo(() => markers.filter((m) => m.kind !== "bus-probe"), [markers]);
  const pulse = useMemo(() => (events && safetyEvents ? computeCityPulse(allEvents, safetyEvents, anchor) : undefined), [
    events,
    safetyEvents,
    allEvents,
    anchor,
  ]);
  const routeNames = useMemo(
    () => Object.fromEntries((routes ?? []).map((r) => [r.routeId, `${r.origin} → ${r.destination}`])),
    [routes],
  );
  const kpiTiles = (kpis ?? []).map((tile) => ({ ...tile, ...KPI_VISUALS[tile.id] }));

  function markerForEvent(event: Event): MapMarker | undefined {
    const issue = allIssues.find((i) => i.relatedEventIds.includes(event.eventId));
    const direct = issue && observationMarkers.find((m) => m.id === issue.issueId);
    return direct ?? nearestMarker(observationMarkers, event.latitude, event.longitude);
  }

  function selectEvent(event: Event) {
    setSelectedEventId(event.eventId);
    setSelectedLocation(null);
    const clip = clips?.find((c) => c.eventId === event.eventId);
    if (clip) setActiveClipId(clip.clipId);
    const marker = markerForEvent(event);
    setSelectedMarkerId(marker?.id ?? null);
    if (!marker) setFocus({ latitude: event.latitude, longitude: event.longitude, key: event.eventId });
  }

  function selectMarker(markerId: string | null) {
    setSelectedMarkerId(markerId);
    setSelectedLocation(null);
    if (!markerId) return;
    const marker = markers.find((m) => m.id === markerId);
    if (!marker) return;
    // The newest event behind this marker drives the player and list.
    const candidates =
      marker.kind === "bus-probe"
        ? allEvents.filter((e) => e.busId === markerId)
        : allEvents.filter((e) => markerForEvent(e)?.id === markerId);
    const latest = [...candidates].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (latest) {
      setSelectedEventId(latest.eventId);
      const clip = clips?.find((c) => c.eventId === latest.eventId);
      if (clip) setActiveClipId(clip.clipId);
    } else {
      setSelectedEventId(null);
    }
  }

  function selectHotspot(hotspot: Hotspot) {
    setSelectedLocation(hotspot.location);
    setSelectedEventId(null);
    setSelectedMarkerId(nearestMarker(observationMarkers, hotspot.latitude, hotspot.longitude)?.id ?? null);
    setFocus({ latitude: hotspot.latitude, longitude: hotspot.longitude, key: hotspot.location });
  }

  function selectClip(clipId: string) {
    setActiveClipId(clipId);
    const clip = clips?.find((c) => c.clipId === clipId);
    const event = clip?.eventId ? allEvents.find((e) => e.eventId === clip.eventId) : undefined;
    if (event) selectEvent(event);
  }

  return (
    <>
      <PageHeader
        title="Command Center"
        context={
          <>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} aria-hidden="true" />
              Mumbai
            </span>
            <span aria-hidden="true">·</span>
            <span>Data as of {formatAnchor(anchor)}</span>
            <SourceBadge source="simulated" />
          </>
        }
      />

      <KpiStrip tiles={kpiTiles} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:h-[700px]">
        <GISMap
          className="xl:col-span-8 h-[440px] sm:h-[520px] xl:h-full"
          ariaLabel="City situation map"
          markers={markers}
          stops={networkStops ?? []}
          routeLines={networkRouteLines ?? []}
          selectedId={selectedMarkerId}
          hoveredId={hoveredMarkerId}
          onSelect={selectMarker}
          focus={focus}
          fitToMarkers
          expandHref="/live-map"
        />
        <div className="xl:col-span-4 flex flex-col gap-4 min-h-0">
          <Panel as="section" className="p-4 shrink-0" aria-label="AI detection">
            <DetectionPlayer
              clips={clips ?? []}
              activeClipId={activeClipId}
              onActiveChange={selectClip}
              routeNames={routeNames}
              cameras={cameras ?? []}
              linkFor={(clip) => {
                const issue = allIssues.find((i) => clip.eventId && i.relatedEventIds.includes(clip.eventId));
                return issue ? `/road-issues/${issue.issueId}` : `/fleet/${clip.busId}`;
              }}
            />
          </Panel>
          <LiveEventList
            className="flex-1 max-h-[420px] xl:max-h-none"
            events={allEvents}
            anchor={anchor}
            selectedEventId={selectedEventId}
            onSelect={selectEvent}
            onHover={(event) => setHoveredMarkerId(event ? markerForEvent(event)?.id ?? null : null)}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <CityPulse className="xl:col-span-5" pulse={pulse} />
        <TopLocations
          className="xl:col-span-7"
          hotspots={topHotspots ?? []}
          selectedLocation={selectedLocation}
          onSelect={selectHotspot}
        />
      </section>
    </>
  );
}
