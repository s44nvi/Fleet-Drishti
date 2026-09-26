// Shapes of the assets produced by scripts/ingest-gtfs.mjs from the public
// mumbai-gtfs community feed (all operators) plus the OSRM road-snapped BEST
// geometry. See src/data/gtfs/source.json for provenance. Kept separate from
// Fleet Drishti's own domain types (types/route.ts) — adapter.ts is the only
// place that translates between the two.

export interface GtfsStopRef {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface GtfsCuratedRoute {
  gtfsRouteId: string;
  shortName: string;
  longName: string;
  origin: GtfsStopRef;
  destination: GtfsStopRef;
  /** Length along the representative trip's real stops. */
  approxDistanceKm: number;
  scheduledTripCount: number;
}

/** public/data/gtfs/routes.geojson feature properties. */
export interface GtfsRouteLineProps {
  id: string;
  routeId: string;
  agencyId: string;
  shortName: string;
  longName: string;
  directionId: number;
  stopCount: number;
  /** First / last stop names of this direction's representative trip. */
  from: string;
  to: string;
  distanceKm: number;
  geometry: "road" | "schematic";
  repaired: number;
}

/** public/data/gtfs/stops.geojson feature properties. */
export interface GtfsStopProps {
  id: string;
  name: string;
  /** Comma-separated agency ids serving the stop. */
  agencies: string;
  routes: number;
  tier: 1 | 2 | 3;
}

/** public/data/gtfs/route-index.json entry. */
export interface GtfsRouteIndexEntry {
  routeId: string;
  agencyId: string;
  shortName: string;
  longName: string;
  tripCount: number;
  stopsServed: number;
  directions: number;
  geometry: "road" | "schematic" | null;
  distanceKm: number | null;
  bbox: [number, number, number, number] | null;
}

export interface GtfsAgencyStats {
  agencyId: string;
  name: string;
  url: string | null;
  routes: number;
  trips: number;
  stops: number;
  roadGeometry: number;
  schematicGeometry: number;
}

export interface GtfsSourceInfo {
  datasetName: string;
  repository: string;
  mobilityDatabaseFeedUrl: string;
  license: string;
  feedPublisher: string | null;
  feedFile: string;
  filesUsed: string[];
  generatedAt: string;
  /** GTFS feed_info service validity window (YYYY-MM-DD). */
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  /** True only when the build date fell within the service window — never a claim of live data. */
  isCurrent: boolean;
  hasShapes: boolean;
  agencies: GtfsAgencyStats[];
  totals: { routes: number; trips: number; stops: number; routeLines: number };
  geometry: {
    road: number;
    schematic: number;
    osrmFile: string | null;
    osrmRepairedLegs: number;
    osrmRouteLinesRepaired: number;
    repairRule: string;
    simplifyToleranceM: number;
  };
  stopTiers: { hubMinRoutes: number; busyMinRoutes: number; counts: number[] };
  notes: string;
  curatedRouteIds: string[];
}
