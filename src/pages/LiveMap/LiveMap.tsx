import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { fleetService, issueService, routeService } from "../../services";
import { congestionToIntensity } from "../../lib/congestion";
import type { MapMarker } from "../../types";

export function LiveMap() {
  const { data: buses } = useAsyncData(() => fleetService.listBuses(), []);
  const { data: issues } = useAsyncData(() => issueService.listIssues(), []);
  const { data: hotspots } = useAsyncData(() => issueService.listTrafficHotspots(), []);
  const { data: safetyEvents } = useAsyncData(() => issueService.listSafetyEvents(), []);
  const { data: infrastructureIssues } = useAsyncData(() => issueService.listInfrastructureIssues(), []);
  // Real BEST route/stop network (GTFS) — separate reference layers under
  // the AI-observation markers above, zoom-gated inside GISMap.
  const { data: networkStops } = useAsyncData(() => routeService.listNetworkStops(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);

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

  const hotspotMarkers: MapMarker[] = (hotspots ?? []).map((hotspot) => ({
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

  // Full-screen operational GIS workspace — no page header/card chrome here
  // (see AppShell's live-map-only layout branch and GISMap's "floating"
  // variant); the map itself is the page, with title/legend as a compact
  // overlay on top of it.
  return (
    <div className="h-full w-full">
      <GISMap
        variant="floating"
        markers={[...infrastructureMarkers, ...hotspotMarkers, ...safetyMarkers, ...issueMarkers, ...busMarkers]}
        stops={networkStops ?? []}
        routeLines={networkRouteLines ?? []}
        title="City-Wide Live Sensing Grid"
      />
    </div>
  );
}
