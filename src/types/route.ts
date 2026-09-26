// A public-transport route that one or more buses run.
//
// `networkSource` distinguishes real-world route data from anything Fleet
// Drishti simulates: "GTFS_BEST" means routeId/name/corridor/origin/
// destination/distanceKm came from the public mumbai-gtfs community feed's
// BEST slice (see src/data/gtfs/source.json for provenance/caveats — it is
// not an official BEST publication and carries no live vehicle data).
// `assignedBusIds`/`activeBusCount` are always Fleet Drishti's own simulated
// sensing fleet, never claimed as real BEST vehicle assignments, regardless
// of `networkSource`.
export interface Route {
  routeId: string;
  name: string;
  corridor: string;
  origin: string;
  destination: string;
  distanceKm: number;
  assignedBusIds: string[];
  activeBusCount: number;
  networkSource: "GTFS_BEST" | "SIMULATED";
}

// A transit operator from the GTFS feed's agency.txt (BEST, TMT, KDMT, VVMT).
export interface TransitAgency {
  agencyId: string;
  name: string;
  url: string | null;
  routes: number;
  trips: number;
  stops: number;
}

// A real bus stop from the public GTFS feed (any operator) — static network
// reference data, not a live arrival/departure signal. `tier` is derived at
// build time from how many routes serve the stop (1 = interchange hub,
// 2 = busy stop, 3 = local stop) and only drives zoom-dependent display.
export interface TransitStop {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  agencyIds: string[];
  routeCount: number;
  tier: 1 | 2 | 3;
  source: "GTFS";
}

// How a route line's geometry was derived. The feed has no shapes.txt, so
// neither is official route geometry:
//  road_snapped             BEST — OSRM road-snapped path validated against
//                           the trip's real stops (detour legs replaced by
//                           straight connectors; see `repairedLegs`)
//  approximate_stop_sequence  the trip's real stops joined in order
export type RouteGeometrySource = "road_snapped" | "approximate_stop_sequence";

// One route+direction's path (see scripts/ingest-gtfs.mjs). A `gtfsRouteId`
// can appear on more than one NetworkRouteLine (one per direction).
export interface NetworkRouteLine {
  gtfsRouteId: string;
  agencyId: string;
  directionId: number;
  shortName: string;
  longName: string;
  stopCount: number;
  /** Real first / last stop of this direction (GTFS). route_long_name's
   * "A ⇆ B" order says nothing about direction — these do. */
  fromStop: string;
  toStop: string;
  distanceKm: number;
  geometryType: RouteGeometrySource;
  /** Stop-to-stop legs drawn straight because the road path was a routing artefact. */
  repairedLegs: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

// Per-route GTFS facts for search, popups and route context.
export interface TransitRouteSummary {
  gtfsRouteId: string;
  agencyId: string;
  shortName: string;
  longName: string;
  tripCount: number;
  stopsServed: number;
  directions: number;
  geometryType: RouteGeometrySource | null;
  distanceKm: number | null;
  /** [west, south, east, north] */
  bbox: [number, number, number, number] | null;
}
