import { useMemo, useState, type ReactNode } from "react";
import { Bus, Gauge, MapPin } from "lucide-react";
import { ButtonLink, SeverityBadge, SourceBadge, StatusBadge } from "../../components/ui";
import { GISMap, MapDrawer } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, issueService, routeService } from "../../services";
import { groupEventsIntoIntelligence } from "../../lib/intelligenceGrouping";
import { isInfrastructureAssetInScope, isRoadDomainType } from "../../lib/taxonomy";
import {
  busMarker,
  infrastructureMarker,
  issueMarker,
  observationGroupMarker,
  safetyMarker,
  trafficMarker,
} from "../../lib/mapMarkers";
import { BUS_STATUS, ISSUE_STATUS } from "../../lib/status";
import { CONGESTION_DISPLAY_LABEL, CONGESTION_TONE } from "../../lib/congestion";
import { datasetAnchor } from "../../lib/pulse";
import { formatMinutesAgo, minutesAgo } from "../../lib/timeAgo";
import type { MapMarker } from "../../types";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-meta">
      <span className="text-ink-3">{label}</span>
      <span className="text-ink text-right">{children}</span>
    </div>
  );
}

// Live Map: "Where is everything?" — the full-bleed GIS workspace. Every
// layer, a layer panel, and a detail drawer for whatever is selected.
export function LiveMap() {
  const { data: buses } = useAsyncData(() => fleetService.listBuses(), []);
  const { data: issues } = useAsyncData(() => issueService.listIssues(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const { data: hotspots } = useAsyncData(() => issueService.listTrafficHotspots(), []);
  const { data: safetyEvents } = useAsyncData(() => issueService.listSafetyEvents(), []);
  const { data: infrastructureIssues } = useAsyncData(() => issueService.listInfrastructureIssues(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);
  const { data: networkStops } = useAsyncData(() => routeService.listNetworkStops(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const anchor = useMemo(
    () => datasetAnchor([...(events ?? []).map((e) => e.timestamp), ...(buses ?? []).map((b) => b.lastSeenAt)]),
    [events, buses],
  );

  const roadGroups = useMemo(() => {
    const roadIssues = (issues ?? []).filter((i) => isRoadDomainType(i.type));
    const fused = new Set(roadIssues.map((i) => i.issueId));
    return groupEventsIntoIntelligence((events ?? []).filter((e) => isRoadDomainType(e.eventType)), roadIssues).filter(
      (g) => !fused.has(g.key),
    );
  }, [issues, events]);

  const markers = useMemo<MapMarker[]>(
    () => [
      ...(infrastructureIssues ?? []).filter((i) => isInfrastructureAssetInScope(i.assetType)).map(infrastructureMarker),
      ...(hotspots ?? []).map((h) => trafficMarker(h, anchor)),
      ...(safetyEvents ?? []).map((e) => safetyMarker(e, anchor)),
      ...roadGroups.map((g) => observationGroupMarker(g, anchor)),
      ...(issues ?? []).filter((i) => i.type !== "safety").map((i) => issueMarker(i, anchor)),
      ...(buses ?? []).map(busMarker),
    ],
    [infrastructureIssues, hotspots, safetyEvents, roadGroups, issues, buses, anchor],
  );

  const selectedMarker = markers.find((m) => m.id === selectedId);
  const selectedBus = buses?.find((b) => b.busId === selectedId);

  function drawerBody(): ReactNode {
    if (!selectedMarker) return null;
    if (selectedBus) {
      const route = routes?.find((r) => r.routeId === selectedBus.routeId);
      return (
        <>
          <Fact label="Status">
            <StatusBadge tone={BUS_STATUS[selectedBus.status].tone}>{BUS_STATUS[selectedBus.status].label}</StatusBadge>
          </Fact>
          <Fact label="Route">{route ? `${route.name} · ${route.origin} → ${route.destination}` : selectedBus.routeId}</Fact>
          <Fact label="Speed">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Gauge size={12} aria-hidden="true" />
              {selectedBus.speedKph} km/h
            </span>
          </Fact>
          <Fact label="Last seen">{formatMinutesAgo(minutesAgo(selectedBus.lastSeenAt, anchor))}</Fact>
          <Fact label="Position">
            <SourceBadge source="simulated" />
          </Fact>
        </>
      );
    }
    const issue = issues?.find((i) => i.issueId === selectedId);
    if (issue) {
      return (
        <>
          <Fact label="Severity">
            <SeverityBadge severity={issue.severity} />
          </Fact>
          <Fact label="Status">
            <StatusBadge tone={ISSUE_STATUS[issue.status].tone}>{ISSUE_STATUS[issue.status].label}</StatusBadge>
          </Fact>
          <Fact label="Seen by">{issue.observingBuses.join(", ")}</Fact>
          <Fact label="Last seen">{formatMinutesAgo(minutesAgo(issue.lastSeen, anchor))}</Fact>
        </>
      );
    }
    const group = roadGroups.find((g) => g.key === selectedId);
    if (group) {
      return (
        <>
          <Fact label="Severity">
            <SeverityBadge severity={group.severity} />
          </Fact>
          <Fact label="Status">
            <StatusBadge tone="neutral">Awaiting corroboration</StatusBadge>
          </Fact>
          <Fact label="Seen by">{group.busIds.join(", ")}</Fact>
          <Fact label="Last seen">{formatMinutesAgo(minutesAgo(group.lastObserved, anchor))}</Fact>
        </>
      );
    }
    const hotspot = hotspots?.find((h) => h.hotspotId === selectedId);
    if (hotspot) {
      return (
        <>
          <Fact label="Congestion">
            <StatusBadge tone={CONGESTION_TONE[hotspot.congestionLevel]}>{CONGESTION_DISPLAY_LABEL[hotspot.congestionLevel]}</StatusBadge>
          </Fact>
          <Fact label="Corridor">{hotspot.corridor}</Fact>
          <Fact label="Average speed">{hotspot.averageSpeedKph} km/h</Fact>
          <Fact label="Reporting buses">{hotspot.observingBusCount}</Fact>
          <Fact label="Observed">{formatMinutesAgo(minutesAgo(hotspot.observedAt, anchor))}</Fact>
        </>
      );
    }
    const safety = safetyEvents?.find((e) => e.safetyEventId === selectedId);
    if (safety) {
      return (
        <>
          <Fact label="Severity">
            <SeverityBadge severity={safety.severity} />
          </Fact>
          <Fact label="Confidence">{safety.confidence}%</Fact>
          <Fact label="Observed by">{safety.busId}</Fact>
          <Fact label="Observed">{formatMinutesAgo(minutesAgo(safety.observedAt, anchor))}</Fact>
        </>
      );
    }
    const asset = infrastructureIssues?.find((i) => i.infrastructureIssueId === selectedId);
    if (asset) {
      return (
        <>
          <Fact label="Condition">
            <span className="capitalize">{asset.condition}</span>
          </Fact>
          <Fact label="Severity">
            <SeverityBadge severity={asset.severity} />
          </Fact>
          <Fact label="Status">
            <StatusBadge tone={ISSUE_STATUS[asset.status].tone}>{ISSUE_STATUS[asset.status].label}</StatusBadge>
          </Fact>
        </>
      );
    }
    return null;
  }

  return (
    <div className="relative h-full w-full p-0 lg:p-3">
      <h1 className="sr-only">Live Map</h1>
      <GISMap
        className="rounded-none lg:rounded-xl border-0 lg:border"
        ariaLabel="Live map of Mumbai"
        markers={markers}
        stops={networkStops ?? []}
        routeLines={networkRouteLines ?? []}
        selectedId={selectedId}
        drawerOpen={Boolean(selectedId)}
        onSelect={setSelectedId}
        legend={
          <div className="flex items-center gap-2 text-micro text-ink-3">
            <SourceBadge source="simulated" />
            Fixture data
          </div>
        }
        overlay={
          selectedMarker && (
            <MapDrawer
              title={selectedMarker.label}
              onClose={() => setSelectedId(null)}
            >
              <div className="flex flex-col">
                {selectedMarker.detail && (
                  <p className="flex items-center gap-1 text-meta text-ink-3 -mt-1 mb-2">
                    {selectedBus ? <Bus size={12} aria-hidden="true" /> : <MapPin size={12} aria-hidden="true" />}
                    {selectedMarker.detail}
                  </p>
                )}
                <div className="divide-y divide-line">{drawerBody()}</div>
                {selectedMarker.href && (
                  <ButtonLink to={selectedMarker.href} variant="primary" className="w-full mt-3">
                    Open details
                  </ButtonLink>
                )}
              </div>
            </MapDrawer>
          )
        }
      />
    </div>
  );
}
