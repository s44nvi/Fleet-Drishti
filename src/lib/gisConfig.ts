import type { StyleSpecification } from "maplibre-gl";

// Single source of truth for the basemap: swap the tile source/style here to
// change provider without touching GISMap.tsx. Token-free OpenStreetMap
// raster tiles — fine for this prototype's traffic, but per OSM's tile usage
// policy a real deployment should move to a provider meant for production
// load (e.g. MapTiler, or a self-hosted tile server).
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

// Rendering all ~885 BEST route-direction lines at full strength at the
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

// The real BEST stop network (~4,800 stops citywide) would clutter the map
// at the default city-wide zoom; only draw it once the viewer has zoomed in
// enough that individual stops are actually useful — still closer than
// having to reach the max zoom level, just closer than the route lines.
export const NETWORK_STOPS_MIN_ZOOM = 13;
