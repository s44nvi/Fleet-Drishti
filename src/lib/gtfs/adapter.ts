// The only place that translates GTFS-derived assets (see ./types.ts) into
// Fleet Drishti's domain model (types/route.ts). Pages, components and
// services go through the service layer, which only sees these functions.
//
// The large network assets (routes, stops, route index) live in
// public/data/gtfs and are fetched once per session, not bundled — the
// browser never parses raw GTFS.
import type { NetworkRouteLine, Route, TransitAgency, TransitRouteSummary, TransitStop } from "../../types";
import curatedRoutesRaw from "../../data/gtfs/mumbaiBestRoutes.json";
import sourceInfoRaw from "../../data/gtfs/source.json";
import type { GtfsCuratedRoute, GtfsRouteIndexEntry, GtfsRouteLineProps, GtfsSourceInfo, GtfsStopProps } from "./types";

const curatedRoutes = curatedRoutesRaw as GtfsCuratedRoute[];
export const gtfsSourceInfo = sourceInfoRaw as GtfsSourceInfo;

const ASSET_BASE = `${import.meta.env.BASE_URL}data/gtfs/`;

/** Operators in the feed, in agency.txt order. */
export const gtfsAgencies: TransitAgency[] = gtfsSourceInfo.agencies.map((a) => ({
  agencyId: a.agencyId,
  name: a.name,
  url: a.url,
  routes: a.routes,
  trips: a.trips,
  stops: a.stops,
}));

/**
 * Real BEST route network facts for the three curated demo routes.
 * `assignedBusIds` / `activeBusCount` stay empty — bus assignment is Fleet
 * Drishti's own simulated fleet, filled in by data/mock/routes.ts.
 */
export function getNetworkRoutes(): Route[] {
  return curatedRoutes.map((r) => ({
    routeId: `BEST-${r.shortName}`,
    name: `Route ${r.shortName}`,
    corridor: `${r.origin.name} - ${r.destination.name}`,
    origin: r.origin.name,
    destination: r.destination.name,
    distanceKm: r.approxDistanceKm,
    assignedBusIds: [],
    activeBusCount: 0,
    networkSource: "GTFS_BEST",
  }));
}

/** Fleet fixture route id ("BEST-9") → its curated GTFS route_id ("9-2"). */
export function fleetRouteToGtfsRouteId(fleetRouteId: string): string | undefined {
  const short = fleetRouteId.replace(/^BEST-/, "");
  return curatedRoutes.find((r) => r.shortName === short)?.gtfsRouteId;
}

// One in-flight/settled request per asset for the whole session.
const cache = new Map<string, Promise<unknown>>();
function fetchAsset<T>(name: string): Promise<T> {
  let p = cache.get(name) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`${ASSET_BASE}${name}`).then((res) => {
      if (!res.ok) throw new Error(`GTFS asset ${name}: ${res.status}`);
      return res.json() as Promise<T>;
    });
    p.catch(() => cache.delete(name)); // allow a retry after a failure
    cache.set(name, p);
  }
  return p;
}

type FeatureCollection<G, P> = { type: "FeatureCollection"; features: { geometry: G; properties: P }[] };

let stopsMemo: Promise<TransitStop[]> | null = null;
/** Every stop served by a trip, all operators (~7,500). Callers render these
 * zoom-gated by `tier`. */
export function getNetworkStops(): Promise<TransitStop[]> {
  stopsMemo ??= fetchAsset<FeatureCollection<{ coordinates: [number, number] }, GtfsStopProps>>("stops.geojson").then((fc) =>
    fc.features.map(({ geometry, properties: p }) => ({
      stopId: p.id,
      name: p.name,
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
      agencyIds: p.agencies ? p.agencies.split(",") : [],
      routeCount: p.routes,
      tier: p.tier,
      source: "GTFS",
    })),
  );
  stopsMemo.catch(() => (stopsMemo = null));
  return stopsMemo;
}

let linesMemo: Promise<NetworkRouteLine[]> | null = null;
/** One LineString per route + direction, all operators — road-snapped for
 * BEST, schematic stop sequence for the others (see `geometryType`). */
export function getNetworkRouteLines(): Promise<NetworkRouteLine[]> {
  linesMemo ??= fetchAsset<FeatureCollection<{ type: "LineString"; coordinates: [number, number][] }, GtfsRouteLineProps>>(
    "routes.geojson",
  ).then((fc) =>
    fc.features.map(({ geometry, properties: p }) => ({
      gtfsRouteId: p.routeId,
      agencyId: p.agencyId,
      directionId: p.directionId,
      shortName: p.shortName,
      longName: p.longName,
      stopCount: p.stopCount,
      fromStop: p.from,
      toStop: p.to,
      distanceKm: p.distanceKm,
      geometryType: p.geometry === "road" ? "road_snapped" : "approximate_stop_sequence",
      repairedLegs: p.repaired,
      geometry: { type: "LineString", coordinates: geometry.coordinates },
    })),
  );
  linesMemo.catch(() => (linesMemo = null));
  return linesMemo;
}

let indexMemo: Promise<TransitRouteSummary[]> | null = null;
/** Per-route GTFS facts (trip counts, stops served, extent) for search and popups. */
export function getRouteIndex(): Promise<TransitRouteSummary[]> {
  indexMemo ??= fetchAsset<GtfsRouteIndexEntry[]>("route-index.json").then((rows) =>
    rows.map((r) => ({
      gtfsRouteId: r.routeId,
      agencyId: r.agencyId,
      shortName: r.shortName,
      longName: r.longName,
      tripCount: r.tripCount,
      stopsServed: r.stopsServed,
      directions: r.directions,
      geometryType: r.geometry === "road" ? "road_snapped" : r.geometry === "schematic" ? "approximate_stop_sequence" : null,
      distanceKm: r.distanceKm,
      bbox: r.bbox,
    })),
  );
  indexMemo.catch(() => (indexMemo = null));
  return indexMemo;
}
