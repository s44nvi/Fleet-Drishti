// Shapes of the static JSON assets produced by scripts/ingest-gtfs.mjs from
// the public mumbai-gtfs community feed's BEST slice (see
// src/data/gtfs/source.json for provenance). These are intentionally
// separate from Fleet Drishti's own domain types (types/route.ts) — this
// file describes what the GTFS ingestion actually produced; adapter.ts is
// the only place that translates between the two.

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
  /** Great-circle distance between the two named terminus stops — a real,
   * derived approximation of route span. This feed has no shapes.txt, so
   * there is no true on-road route length to draw on instead. */
  approxDistanceKm: number;
  scheduledTripCount: number;
}

export interface GtfsStop {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  area: string | null;
}

/** One route+direction's approximate path — see types/route.ts's
 * NetworkRouteLine, which this maps onto directly (the two shapes are
 * intentionally the same; this one just documents it as "what ingestion
 * produced"). The source feed can carry a route's Up/Down directions either
 * as the same gtfsRouteId with a different directionId, or as entirely
 * separate route_ids — so more than one GtfsRouteLine can share a
 * gtfsRouteId. */
export interface GtfsRouteLine {
  gtfsRouteId: string;
  directionId: number;
  shortName: string;
  longName: string;
  tripId: string;
  stopCount: number;
  distanceKm: number;
  geometryType: "approximate_stop_sequence";
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

export interface GtfsSourceInfo {
  agency: string;
  datasetName: string;
  repository: string;
  mobilityDatabaseFeedUrl: string;
  license: string;
  filesUsed: string[];
  retrievedAt: string;
  /** GTFS calendar/feed_info service validity window (YYYY-MM-DD), not a
   * claim about when the underlying road network was last surveyed. */
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  /** True only when today's date falls within [serviceStartDate,
   * serviceEndDate] — never a claim of live/real-time data. */
  isCurrent: boolean;
  hasShapes: boolean;
  hasApproximateGeometry: boolean;
  notes: string;
  totalRoutesInFeed: number;
  totalStopsInFeed: number;
  totalTripsInFeed: number;
  totalRouteLinesDerived: number;
  curatedRouteIds: string[];
}
