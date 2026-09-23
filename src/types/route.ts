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

// A real BEST bus stop from the public GTFS feed — static network
// reference data, not a live arrival/departure signal.
export interface TransitStop {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  area: string | null;
  source: "GTFS_BEST";
}

// One route+direction's approximate path, derived from the public GTFS feed
// by connecting that direction's real stops in their recorded stop_sequence
// order (see scripts/ingest-gtfs.mjs). The feed has no shapes.txt, so this
// is never official route geometry — `geometryType` makes that explicit so
// any consumer (map popup, future export, etc.) can carry the disclaimer
// forward instead of re-deriving it. A `gtfsRouteId` can appear on more than
// one NetworkRouteLine (one per direction).
export interface NetworkRouteLine {
  gtfsRouteId: string;
  directionId: number;
  shortName: string;
  longName: string;
  distanceKm: number;
  geometryType: "approximate_stop_sequence";
  geometry: { type: "LineString"; coordinates: [number, number][] };
}
