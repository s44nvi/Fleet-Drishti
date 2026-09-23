import type { Bus, InfrastructureIssue, Issue, MapMarker, SafetyEvent, TrafficHotspot } from "../types";
import type { IntelligenceGroup } from "./intelligenceGrouping";
import { CONGESTION_DISPLAY_LABEL, congestionToIntensity } from "./congestion";
import { BUS_STATUS } from "./status";
import { categoryVisual } from "./visuals";
import { minutesAgo } from "./timeAgo";

// One place that turns each domain record into a map marker, so a pothole
// or a bus looks and reads the same on every map in the app.

const RECENT_MINUTES = 5;
const isRecent = (timestamp: string, anchor?: string) => (anchor ? minutesAgo(timestamp, anchor) <= RECENT_MINUTES : false);

export function busMarker(bus: Bus): MapMarker {
  return {
    id: bus.busId,
    kind: "bus-probe",
    category: "bus",
    label: bus.label,
    detail: `${bus.routeId.replace("BEST-", "Route ")} · ${BUS_STATUS[bus.status].label}`,
    latitude: bus.location.latitude,
    longitude: bus.location.longitude,
    href: `/fleet/${bus.busId}`,
    tone: BUS_STATUS[bus.status].tone,
  };
}

export function issueMarker(issue: Issue, anchor?: string): MapMarker {
  const kind = issue.type === "safety" ? "vulnerable-crossing" : issue.type === "traffic-blockage" ? "traffic-chokepoint" : "critical-distress";
  return {
    id: issue.issueId,
    kind,
    category: issue.subtype,
    label: categoryVisual(issue.subtype).label,
    detail: `${issue.location} · ${issue.observingBuses.length} bus${issue.observingBuses.length === 1 ? "" : "es"}`,
    latitude: issue.latitude,
    longitude: issue.longitude,
    href: `/road-issues/${issue.issueId}`,
    intensity: issue.severity,
    recent: isRecent(issue.lastSeen, anchor),
  };
}

export function observationGroupMarker(group: IntelligenceGroup, anchor?: string): MapMarker {
  return {
    id: group.key,
    kind: "critical-distress",
    category: group.subtype,
    label: categoryVisual(group.subtype).label,
    detail: `${group.location} · awaiting corroboration`,
    latitude: group.latitude,
    longitude: group.longitude,
    href: group.linkTo,
    recent: isRecent(group.lastObserved, anchor),
  };
}

export function trafficMarker(hotspot: TrafficHotspot, anchor?: string): MapMarker {
  return {
    id: hotspot.hotspotId,
    kind: "traffic-chokepoint",
    category: "congestion",
    label: hotspot.location,
    detail: `${CONGESTION_DISPLAY_LABEL[hotspot.congestionLevel]} congestion · ${hotspot.averageSpeedKph} km/h`,
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    intensity: congestionToIntensity(hotspot.congestionLevel),
    recent: isRecent(hotspot.observedAt, anchor),
  };
}

export function safetyMarker(event: SafetyEvent, anchor?: string, href?: string): MapMarker {
  return {
    id: event.safetyEventId,
    kind: "vulnerable-crossing",
    category: event.type,
    label: categoryVisual(event.type).label,
    detail: `${event.location} · ${event.busId}`,
    latitude: event.latitude,
    longitude: event.longitude,
    tone: "safety",
    href,
    recent: isRecent(event.observedAt, anchor),
  };
}

export function infrastructureMarker(item: InfrastructureIssue): MapMarker {
  return {
    id: item.infrastructureIssueId,
    kind: "infrastructure-asset",
    category: item.assetType,
    label: `${categoryVisual(item.assetType).label} · ${item.condition}`,
    detail: item.location,
    latitude: item.latitude,
    longitude: item.longitude,
    intensity: item.severity,
  };
}

// Nearest marker to a point (metres, equirectangular — fine at city scale).
export function nearestMarker(markers: MapMarker[], latitude: number, longitude: number, maxMetres = 400): MapMarker | undefined {
  let best: MapMarker | undefined;
  let bestD = Infinity;
  const kx = 111_320 * Math.cos((latitude * Math.PI) / 180);
  for (const m of markers) {
    const d = Math.hypot((m.longitude - longitude) * kx, (m.latitude - latitude) * 110_540);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return bestD <= maxMetres ? best : undefined;
}
