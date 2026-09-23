// The only place that translates raw GTFS-shaped JSON (see ./types.ts) into
// Fleet Drishti's own domain model (types/route.ts). Nothing outside this
// file should import the raw src/data/gtfs/*.json assets directly — pages,
// components, and services all go through the service layer, which in turn
// only ever sees the functions below.
import type { NetworkRouteLine, Route, TransitStop } from "../../types";
import curatedRoutesRaw from "../../data/gtfs/mumbaiBestRoutes.json";
import sourceInfoRaw from "../../data/gtfs/source.json";
import type { GtfsCuratedRoute, GtfsRouteLine, GtfsSourceInfo, GtfsStop } from "./types";

const curatedRoutes = curatedRoutesRaw as GtfsCuratedRoute[];
export const gtfsSourceInfo = sourceInfoRaw as GtfsSourceInfo;

/**
 * Real BEST route network facts (identity, geography, real-terminus-derived
 * distance) adapted from the public GTFS feed. `assignedBusIds` and
 * `activeBusCount` are left empty here — bus-to-route assignment is Fleet
 * Drishti's own simulated fleet concern, not a GTFS translation concern, and
 * is filled in by the service layer (see data/mock/routes.ts).
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

/** Real BEST stop network data — every stop in the feed, unfiltered. Callers
 * that render these on a map are responsible for zoom-gating visibility;
 * this function makes no assumption about how many will actually be shown
 * at once. Loaded via dynamic import — at ~4,800 stops this JSON asset is
 * the largest thing this app ships, so it's code-split out of the main
 * bundle and only fetched once something actually needs the stop layer. */
export async function getNetworkStops(): Promise<TransitStop[]> {
  const { default: rawStops } = await import("../../data/gtfs/mumbaiBestStops.json");
  return (rawStops as GtfsStop[]).map((s) => ({
    stopId: s.stopId,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    area: s.area,
    source: "GTFS_BEST",
  }));
}

/** Real BEST route network paths — one approximate LineString per route,
 * derived from stop_times/trips (see scripts/ingest-gtfs.mjs). Loaded via
 * dynamic import for the same reason as getNetworkStops(): this is the
 * biggest asset the app ships, and most pages never need it. */
export async function getNetworkRouteLines(): Promise<NetworkRouteLine[]> {
  const { default: rawLines } = await import("../../data/gtfs/mumbaiBestRouteLines.json");
  return (rawLines as GtfsRouteLine[]).map((l) => ({
    gtfsRouteId: l.gtfsRouteId,
    directionId: l.directionId,
    shortName: l.shortName,
    longName: l.longName,
    distanceKm: l.distanceKm,
    geometryType: l.geometryType,
    geometry: l.geometry,
  }));
}
