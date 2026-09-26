import type { Bus, Camera, DemoSensingBus, Detection, Event, Route } from "../types";
import { gtfsAgencies } from "./gtfs/adapter";
import { BUS_STATUS } from "./status";
import { categoryVisual, type Tone } from "./visuals";

// One view of a sensing bus for map callouts and drawers, whether it is a
// fixture bus (SIMULATED) or a density-layer bus (DEMO). Every field is
// derived from fixtures or GTFS — nothing is invented to fill a slot; a
// missing fact renders as an honest fallback.
export interface SensingBusView {
  busId: string;
  agencyId: string;
  agencyName: string;
  routeShortName: string;
  routeLongName: string | null;
  /**
   * The route's terminals. `directional` is true only when the data says
   * which way the bus runs (demo buses sit on one trip direction); fixture
   * buses carry no direction, so their terminals are shown both-ways.
   */
  terminals: { from: string; to: string; directional: boolean } | null;
  status: { label: string; tone: Tone };
  cameraCount: number;
  camerasOnline: number;
  cameras: string;
  /** True when the bus has produced detections in the fixture window. */
  aiActive: boolean;
  aiProcessing: string;
  latestObservation: string | null;
  confidence: number | null;
  lastLocation: string;
  positionSource: "SIMULATED" | "DEMO";
}

const agencyName = (id: string) => gtfsAgencies.find((a) => a.agencyId === id)?.name ?? id;

export function fixtureBusView(
  bus: Bus,
  cameras: Camera[],
  events: Event[],
  detections: Detection[],
  route?: Pick<Route, "origin" | "destination"> | null,
): SensingBusView {
  const own = cameras.filter((c) => c.busId === bus.busId);
  const online = own.filter((c) => c.status !== "offline").length;
  const ownEvents = events.filter((e) => e.busId === bus.busId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const ownDetections = detections.filter((d) => d.busId === bus.busId).length;
  const latest = ownEvents[0];
  return {
    busId: bus.busId,
    agencyId: "BEST",
    agencyName: agencyName("BEST"),
    routeShortName: bus.routeId.replace(/^BEST-/, ""),
    routeLongName: route ? `${route.origin} ⇆ ${route.destination}` : null,
    terminals: route ? { from: route.origin, to: route.destination, directional: false } : null,
    status: BUS_STATUS[bus.status],
    cameraCount: own.length,
    camerasOnline: online,
    cameras: own.length ? `${online} of ${own.length} online` : "None registered",
    aiActive: ownDetections > 0,
    aiProcessing: `${ownDetections} detection${ownDetections === 1 ? "" : "s"} · ${ownEvents.length} validated`,
    latestObservation: latest ? `${categoryVisual(latest.subtype).label} · ${latest.location}` : null,
    confidence: latest?.confidence ?? null,
    lastLocation: latest ? `${latest.location}${latest.landmark ? ` (${latest.landmark})` : ""}` : "No observation yet",
    positionSource: "SIMULATED",
  };
}

export function demoBusView(bus: DemoSensingBus): SensingBusView {
  return {
    busId: bus.busId,
    agencyId: bus.agencyId,
    agencyName: agencyName(bus.agencyId),
    routeShortName: bus.routeShortName,
    routeLongName: bus.routeLongName,
    terminals: bus.fromStop && bus.toStop ? { from: bus.fromStop, to: bus.toStop, directional: true } : null,
    status: bus.status === "active" ? { label: "Online", tone: "ok" } : { label: "Idle", tone: "watch" },
    cameraCount: bus.cameraCount,
    camerasOnline: bus.camerasOnline,
    cameras: `${bus.camerasOnline} of ${bus.cameraCount} online (demo)`,
    aiActive: false,
    aiProcessing: "No detections — demo vehicle",
    latestObservation: null,
    confidence: null,
    lastLocation: bus.nearStopName ? `Near ${bus.nearStopName} (demo position)` : "Demo position on route",
    positionSource: "DEMO",
  };
}
