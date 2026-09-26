import type { StyleSpecification } from "maplibre-gl";

// Single source of truth for the basemap: swap the style here to change
// provider without touching GISMap.tsx.
//
// Primary: OpenFreeMap "Positron" — a token-free, muted light vector style
// (OpenStreetMap data), so Fleet Drishti's own intelligence layers are the
// only colour on the map (MASTER.md §10).
export const LIGHT_VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// Fallback if the vector style can't be fetched: token-free OpenStreetMap
// raster tiles. Per OSM's tile usage policy a production deployment should
// move to a provider meant for production load (or a self-hosted server).
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

// [longitude, latitude] — MapLibre's coordinate order.
export const MUMBAI_METROPOLITAN_CENTER: [number, number] = [72.8777, 19.076];

export const DEFAULT_ZOOM = 11;
export const MIN_ZOOM = 9;
export const MAX_ZOOM = 18;

// Rendering all ~1,100 GTFS route-direction lines at full strength at the
// default city-wide view (DEFAULT_ZOOM, ~3km) would be illegible spaghetti
// that drowns out the Fleet Drishti markers it sits behind. Rather than a
// hard minzoom that makes the whole network disappear below some threshold,
// GISMap.tsx ramps the route-lines layer's line-opacity/line-width up
// continuously with zoom (a MapLibre zoom expression) — barely-there at
// DEFAULT_ZOOM, strengthening smoothly as the viewer zooms in. These are the
// zoom stops that ramp references, kept here alongside the other zoom
// constants rather than as magic numbers in the layer paint.
export const NETWORK_ROUTES_ZOOM_STOPS = {
  faint: MIN_ZOOM, // 9 — barely visible city-wide wash
  cityView: DEFAULT_ZOOM, // 11 — Command Center's default ~3km view: subtle, but never fully invisible
  midZoom: 13,
  closeZoom: 15, // ~1km view — reads as a clear, distinct network
  fullDetail: 17,
};


// Muted per-operator route tints (GTFS agency_id). The network is context,
// not content: these stay low-saturation and low-opacity so Fleet Drishti
// buses and observations remain the strongest things on the map.
export const AGENCY_ROUTE_COLORS: Record<string, string> = {
  BEST: "#7f93b3",
  TMT: "#6f9c88",
  KDMT: "#b08d64",
  VVMT: "#9486b8",
};
export const DEFAULT_ROUTE_COLOR = "#8fa3bf";

// Stops are tiered at build time by how many routes serve them. Hubs show
// city-wide, busy stops from mid zoom, every stop only when close in, and
// names only when zoomed right in — ~7,500 stops never draw at once.
export const STOP_TIER_MIN_ZOOM = { 1: 10.5, 2: 12.5, 3: 14 } as const;
export const STOP_LABEL_MIN_ZOOM = 15.5;
