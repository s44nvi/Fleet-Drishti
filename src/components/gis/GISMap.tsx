import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ErrorBoundary } from "../ErrorBoundary";
import { isWebGL2Supported } from "../../lib/webgl";
import {
  Bus,
  Building2,
  ChevronDown,
  Construction,
  Crosshair,
  Flame,
  Layers,
  Maximize2,
  Minus,
  Plus,
  Search,
  ShieldAlert,
  TrafficCone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { RouteCallout } from "./MapCallouts";
import {
  AGENCY_ROUTE_COLORS,
  DEFAULT_ROUTE_COLOR,
  DEFAULT_ZOOM,
  LIGHT_VECTOR_STYLE_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  MUMBAI_METROPOLITAN_CENTER,
  NETWORK_ROUTES_ZOOM_STOPS,
  OSM_RASTER_STYLE,
  STOP_LABEL_MIN_ZOOM,
  STOP_TIER_MIN_ZOOM,
} from "../../lib/gisConfig";
import { gtfsAgencies } from "../../lib/gtfs/adapter";
import { routeService } from "../../services/routeService";
import { SEVERITY_TONE, TONE_CLASSES, TONE_HEX, categoryVisual, type Tone } from "../../lib/visuals";
import type { MapMarker, MapMarkerKind, NetworkRouteLine, TransitRouteSummary, TransitStop } from "../../types";

export interface CongestionSegment {
  coordinates: [number, number][];
  /** 0..1 */
  weight: number;
  /** Drawn wider — e.g. the selected corridor's own road. */
  emphasis?: boolean;
}

export interface MapCallout {
  key: string;
  latitude: number;
  longitude: number;
  content: ReactNode;
  /** Which side of the point the card sits on. */
  side?: "left" | "right";
}

export interface RasterOverlay {
  url: string;
  /** Corners: top-left, top-right, bottom-right, bottom-left, [lng, lat]. */
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  label: string;
  opacity?: number;
}

export interface HeatPoint {
  longitude: number;
  latitude: number;
  /** 0..1 */
  weight: number;
}

interface GISMapProps {
  markers: MapMarker[];
  /** Real GTFS stop network, all operators — zoom-gated by stop tier. */
  stops?: TransitStop[];
  /** Real GTFS route paths, all operators (road-snapped BEST, schematic others). */
  routeLines?: NetworkRouteLine[];
  /** BEST route short name ("9") to highlight in both directions; the map
   * fits to it when it changes. */
  highlightRoute?: string | null;
  /** Any operator's route to highlight by GTFS route_id (e.g. a demo bus's
   * route); takes precedence over `highlightRoute`. Fits to it on change. */
  highlightRouteId?: string | null;
  /** Start with the stop layer hidden (it stays in the layer panel). */
  initialShowStops?: boolean;
  /** Adds route search (number / terminal name) to the layer panel. */
  routeSearch?: boolean;
  /** Content for a compact callout pinned to the selected marker (e.g. bus
   * details). Return null for markers the page handles another way; `close`
   * clears the selection. */
  markerPopup?: (marker: MapMarker, close: () => void) => ReactNode | null;
  /** Fit the view to a page-highlighted route (default). Off to highlight
   * a selected bus's route without re-framing the map. */
  fitHighlightedRoute?: boolean;
  /** List ↔ map: the selected marker flies into view and gets a halo. */
  selectedId?: string | null;
  /** List ↔ map: hovering a list row lifts its marker. */
  hoveredId?: string | null;
  /** When provided, clicking a marker selects it instead of navigating. */
  onSelect?: (id: string | null) => void;
  /** Fly to the selected marker (default). Off when the page frames the
   * selection another way, e.g. by fitting to a highlighted route. */
  flyToSelection?: boolean;
  /** A MapDrawer is showing — keep the selection clear of it. */
  drawerOpen?: boolean;
  /** `ramp` defaults to the amber→red risk ramp; "congestion" uses the
   * green→yellow→red traffic ramp. */
  heatmap?: { points: HeatPoint[]; label: string; ramp?: "risk" | "congestion" };
  /** Road segments coloured by a 0..1 congestion weight (Traffic page).
   * Toggles together with the heatmap layer. */
  congestionSegments?: CongestionSegment[];
  /** A georeferenced image drawn under the route network (e.g. the Traffic
   * page's congestion heat raster). Toggles with the heatmap layer. */
  rasterOverlay?: RasterOverlay | null;
  /** Floating cards pinned to map locations (e.g. the busiest corridors). */
  callouts?: MapCallout[];
  /** Start with the BEST route layer hidden (it stays in the layer panel). */
  initialShowRoutes?: boolean;
  /** Fly to an arbitrary point (e.g. a selected hotspot); re-flies when `key` changes. */
  focus?: { latitude: number; longitude: number; key: string; zoom?: number } | null;
  /** Fit the initial view to the markers instead of the city-wide default. */
  fitToMarkers?: boolean;
  /** Adds an "open full map" button to the control rail. */
  expandHref?: string;
  /** Extra content inside the layer panel (e.g. a legend). */
  legend?: ReactNode;
  /** Floating content positioned by the caller. */
  overlay?: ReactNode;
  showLayerPanel?: boolean;
  className?: string;
  ariaLabel?: string;
}

const NETWORK_STOPS_SOURCE_ID = "fd-network-stops";
const NETWORK_ROUTES_SOURCE_ID = "fd-network-routes";
const NETWORK_ROUTES_LAYER_ID = "fd-network-routes-layer";
const NETWORK_ROUTES_SCHEMATIC_LAYER_ID = "fd-network-routes-schematic";
const NETWORK_ROUTES_HIGHLIGHT_LAYER_ID = "fd-network-routes-highlight";
const ROUTE_LAYER_IDS = [NETWORK_ROUTES_LAYER_ID, NETWORK_ROUTES_SCHEMATIC_LAYER_ID];
const STOP_LAYER_IDS = ["fd-stops-tier1", "fd-stops-tier2", "fd-stops-tier3"] as const;
const STOP_LABEL_LAYER_ID = "fd-stops-labels";
const HEAT_SOURCE_ID = "fd-heat";
const HEAT_LAYER_ID = "fd-heat-layer";
const RASTER_SOURCE_ID = "fd-raster";
const RASTER_LAYER_ID = "fd-raster-layer";
const CONGESTION_SOURCE_ID = "fd-congestion";
const CONGESTION_CASING_LAYER_ID = "fd-congestion-casing";
const CONGESTION_LAYER_ID = "fd-congestion-layer";

const RISK_HEAT_COLOR: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(254,243,226,0)",
  0.15,
  "rgba(254,236,200,0.55)",
  0.4,
  "#f5b73b",
  0.65,
  "#e08a00",
  0.85,
  "#dc2626",
  1,
  "#991b1b",
];

// Traffic convention: free flow green → yellow → orange → red.
const CONGESTION_HEAT_COLOR: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,
  "rgba(34,160,90,0)",
  0.12,
  "rgba(34,160,90,0.28)",
  0.35,
  "rgba(214,201,58,0.55)",
  0.6,
  "rgba(240,146,43,0.7)",
  0.85,
  "rgba(225,60,44,0.8)",
  1,
  "rgba(185,28,28,0.85)",
];

function segmentsToGeoJSON(segments: CongestionSegment[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: segments.map((seg) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: seg.coordinates },
      properties: { weight: seg.weight, emphasis: seg.emphasis ? 1 : 0 },
    })),
  };
}
const NONE = "__none__";

const NETWORK_COLOR = DEFAULT_ROUTE_COLOR;
const NETWORK_HIGHLIGHT_COLOR = TONE_HEX.action;
const AGENCY_COLOR_EXPR: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "agencyId"],
  ...Object.entries(AGENCY_ROUTE_COLORS).flat(),
  DEFAULT_ROUTE_COLOR,
] as unknown as maplibregl.ExpressionSpecification;

const KIND_META: Record<MapMarkerKind, { label: string; icon: LucideIcon; tone: Tone; category: string }> = {
  "bus-probe": { label: "Sensing buses", icon: Bus, tone: "ok", category: "bus" },
  "critical-distress": { label: "Road issues", icon: Construction, tone: "alert", category: "pothole" },
  "traffic-chokepoint": { label: "Traffic", icon: TrafficCone, tone: "watch", category: "congestion" },
  "vulnerable-crossing": { label: "Safety", icon: ShieldAlert, tone: "safety", category: "pedestrian-conflict" },
  "infrastructure-asset": { label: "Infrastructure", icon: Building2, tone: "watch", category: "signage" },
};
const KIND_ORDER: MapMarkerKind[] = [
  "bus-probe",
  "critical-distress",
  "traffic-chokepoint",
  "vulnerable-crossing",
  "infrastructure-asset",
];

// Real backend data can carry values this frontend's fixtures never did
// (e.g. a legacy Issue row's severity stored as a raw score string like
// "70" from before the backend bucketed severity into low/medium/high) —
// every lookup here falls back to "neutral" instead of indexing
// TONE_CLASSES/KIND_META with something that isn't actually a valid key,
// which otherwise throws and (via GISMap's ErrorBoundary) blanks the map.
function markerTone(marker: MapMarker): Tone {
  if (marker.tone && marker.tone in TONE_CLASSES) return marker.tone;
  if (marker.intensity && marker.intensity in SEVERITY_TONE) return SEVERITY_TONE[marker.intensity];
  return KIND_META[marker.kind]?.tone ?? "neutral";
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function stopsToGeoJSON(stops: TransitStop[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stops.map((stop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [stop.longitude, stop.latitude] },
      properties: { name: stop.name, agencies: stop.agencyIds.join(" · "), routes: stop.routeCount, tier: stop.tier },
    })),
  };
}

function routeLinesToGeoJSON(lines: NetworkRouteLine[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: lines.map((line) => ({
      type: "Feature",
      geometry: line.geometry,
      properties: {
        gtfsRouteId: line.gtfsRouteId,
        agencyId: line.agencyId,
        shortName: line.shortName,
        longName: line.longName,
        fromStop: line.fromStop,
        toStop: line.toStop,
        distanceKm: line.distanceKm,
        geometryType: line.geometryType,
        repairedLegs: line.repairedLegs,
      },
    })),
  };
}

// The route the viewer opened (by clicking a line or via search).
interface SelectedRoute {
  gtfsRouteId: string;
  agencyId: string;
  shortName: string;
  longName: string;
  fromStop: string;
  toStop: string;
  geometryType: NetworkRouteLine["geometryType"];
  repairedLegs: number;
  lngLat: [number, number];
}

function heatToGeoJSON(points: HeatPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: { weight: p.weight },
    })),
  };
}

// Add, update or remove the image overlay. It sits just under the route
// network (or the congestion lines) so they and the markers stay on top.
function syncRaster(map: MapLibreMap, overlay: RasterOverlay | null | undefined) {
  const source = map.getSource(RASTER_SOURCE_ID) as maplibregl.ImageSource | undefined;
  if (!overlay?.url) {
    if (map.getLayer(RASTER_LAYER_ID)) map.removeLayer(RASTER_LAYER_ID);
    if (source) map.removeSource(RASTER_SOURCE_ID);
    return;
  }
  if (source) {
    source.updateImage({ url: overlay.url, coordinates: overlay.coordinates });
    return;
  }
  const before = [NETWORK_ROUTES_LAYER_ID, CONGESTION_CASING_LAYER_ID].find((id) => map.getLayer(id));
  map.addSource(RASTER_SOURCE_ID, { type: "image", url: overlay.url, coordinates: overlay.coordinates });
  map.addLayer(
    {
      id: RASTER_LAYER_ID,
      type: "raster",
      source: RASTER_SOURCE_ID,
      paint: { "raster-opacity": overlay.opacity ?? 0.9, "raster-fade-duration": 0, "raster-resampling": "linear" },
    },
    before,
  );
}

// Tooltip / popup bodies are built with DOM text nodes, never innerHTML, so
// fixture strings can't inject markup.
function tooltipNode(title: string, detail?: string): HTMLElement {
  const root = document.createElement("div");
  const strong = document.createElement("div");
  strong.style.fontWeight = "700";
  strong.textContent = title;
  root.appendChild(strong);
  if (detail) {
    const sub = document.createElement("div");
    sub.style.opacity = "0.75";
    sub.style.marginTop = "2px";
    sub.textContent = detail;
    root.appendChild(sub);
  }
  return root;
}

function stopPopupNode(props: { name: string; agencies: string; routes: number }): HTMLElement {
  const root = document.createElement("div");
  root.className = "text-body text-ink max-w-[240px]";
  const title = document.createElement("p");
  title.className = "text-item";
  title.textContent = props.name;
  const sub = document.createElement("p");
  sub.className = "text-meta text-ink-2 mt-0.5";
  sub.textContent = `${props.agencies} · served by ${props.routes} route${props.routes === 1 ? "" : "s"}`;
  const note = document.createElement("p");
  note.className = "text-meta text-ink-3 mt-1.5";
  note.textContent = "GTFS stop (scheduled network) — not a live arrivals feed";
  root.append(title, sub, note);
  return root;
}

function MarkerGlyph({ marker, selected, hovered }: { marker: MapMarker; selected: boolean; hovered: boolean }) {
  const tone = markerTone(marker);
  const Icon = categoryVisual(marker.category ?? KIND_META[marker.kind].category).icon;
  const isBus = marker.kind === "bus-probe";
  const isDemo = marker.positionSource === "DEMO";
  const size = selected ? 32 : isDemo ? 22 : 26;
  return (
    <span
      className={cn(
        "relative flex items-center justify-center transition-transform duration-150",
        hovered && !selected && "scale-115",
      )}
      style={{ width: size, height: size }}
    >
      {marker.recent && !selected && (
        <span className={cn("fd-recent-ring absolute inset-0", isBus ? "rounded-md" : "rounded-full", TONE_CLASSES[tone].solid)} aria-hidden="true" />
      )}
      <span
        className={cn(
          "relative flex h-full w-full items-center justify-center border-2 border-white text-white shadow-[0_1px_4px_rgb(14_26_43/0.35)]",
          isBus ? "rounded-md" : "rounded-full",
          TONE_CLASSES[tone].solid,
          selected && "ring-4 ring-action/35",
        )}
      >
        <Icon size={selected ? 17 : isDemo ? 12 : 14} strokeWidth={2.25} aria-hidden="true" />
      </span>
    </span>
  );
}

function RouteSearch({
  query,
  onQuery,
  results,
  loading,
  onPick,
}: {
  query: string;
  onQuery: (q: string) => void;
  results: TransitRouteSummary[];
  loading: boolean;
  onPick: (r: TransitRouteSummary) => void;
}) {
  return (
    <div className="mb-1.5 border-b border-line pb-2">
      <label className="relative block">
        <span className="sr-only">Find a route by number or terminal</span>
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Route no. or terminal"
          className="h-8 w-full rounded-md border border-line-strong bg-surface pl-8 pr-2 text-meta text-ink placeholder:text-ink-3"
        />
      </label>
      {query && (
        <ul className="mt-1 flex flex-col" aria-label="Matching routes">
          {loading && <li className="px-1 py-1.5 text-micro text-ink-3">Loading routes…</li>}
          {!loading && results.length === 0 && <li className="px-1 py-1.5 text-micro text-ink-3">No route with drawn geometry matches</li>}
          {results.map((r) => (
            <li key={r.gtfsRouteId}>
              <button type="button" onClick={() => onPick(r)} className="w-full rounded-md px-1.5 py-1 text-left hover:bg-surface-2">
                <span className="flex items-center gap-1.5 text-meta text-ink">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: AGENCY_ROUTE_COLORS[r.agencyId] ?? NETWORK_COLOR }} aria-hidden="true" />
                  <span className="font-semibold">
                    {r.agencyId} {r.shortName}
                  </span>
                </span>
                <span className="block truncate text-micro text-ink-3">{r.longName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RailButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-9 w-9 inline-flex items-center justify-center text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors duration-150"
    >
      {children}
    </button>
  );
}

function LayerToggle({
  checked,
  onChange,
  label,
  swatch,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  swatch: ReactNode;
  count?: number;
}) {
  return (
    <label className="flex items-center gap-2.5 h-8 px-1 rounded-md cursor-pointer hover:bg-surface-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#1d5fe0] cursor-pointer" />
      <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
        {swatch}
      </span>
      <span className={cn("flex-1 text-meta", checked ? "text-ink" : "text-ink-3")}>{label}</span>
      {count !== undefined && <span className="text-micro text-ink-3 tabular-nums">{count}</span>}
    </label>
  );
}

// Real MapLibre GL map — one instance per component, created/torn down in
// effects. Back to front: basemap → optional heatmap → BEST route network →
// BEST stops → Fleet Drishti intelligence markers (DOM markers, rendered as
// React portals so they share the design system's icons and tokens).
//
// Not exported directly — see GISMap below, which gates this behind a
// WebGL2 check and an error boundary so a map failure can never take down
// the rest of the app.
function GISMapCanvas({
  markers,
  stops = [],
  routeLines = [],
  highlightRoute = null,
  highlightRouteId = null,
  initialShowStops = true,
  routeSearch = false,
  markerPopup,
  fitHighlightedRoute = true,
  selectedId = null,
  hoveredId = null,
  onSelect,
  flyToSelection = true,
  drawerOpen = false,
  heatmap,
  congestionSegments,
  rasterOverlay,
  callouts,
  initialShowRoutes = true,
  focus = null,
  fitToMarkers = false,
  expandHref,
  legend,
  overlay,
  showLayerPanel = true,
  className,
  ariaLabel = "Map of Mumbai",
}: GISMapProps) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerInstancesRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const markerElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const tooltipRef = useRef<maplibregl.Popup | null>(null);

  // Latest-value refs read by MapLibre/DOM event handlers.
  const markersByIdRef = useRef<Map<string, MapMarker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const navigateRef = useRef(navigate);
  const stopsRef = useRef(stops);
  const routeLinesRef = useRef(routeLines);
  const heatRef = useRef(heatmap?.points ?? []);
  const heatRampRef = useRef(heatmap?.ramp ?? "risk");
  const segmentsRef = useRef<CongestionSegment[]>(congestionSegments ?? []);
  const rasterRef = useRef(rasterOverlay);
  const calloutMarkersRef = useRef<Map<string, { marker: MapLibreMarker; el: HTMLDivElement }>>(new Map());
  const selectedRouteIdRef = useRef<string | null>(null);
  const highlightFilterRef = useRef<(hoverRouteId?: string) => maplibregl.FilterSpecification>(() => ["==", ["get", "gtfsRouteId"], NONE]);
  const openRouteRef = useRef<(route: SelectedRoute | null) => void>(() => {});
  const highlightRouteRef = useRef(highlightRoute);
  const highlightRouteIdRef = useRef(highlightRouteId);
  onSelectRef.current = onSelect;
  navigateRef.current = navigate;
  stopsRef.current = stops;
  routeLinesRef.current = routeLines;
  heatRef.current = heatmap?.points ?? [];
  heatRampRef.current = heatmap?.ramp ?? "risk";
  segmentsRef.current = congestionSegments ?? [];
  rasterRef.current = rasterOverlay;
  highlightRouteRef.current = highlightRoute;
  highlightRouteIdRef.current = highlightRouteId;

  const [styleReady, setStyleReady] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [hiddenKinds, setHiddenKinds] = useState<Set<MapMarkerKind>>(new Set());
  // Route visibility per operator. `null` = the page asked for routes to
  // start hidden, before the operator list is known.
  const [hiddenAgencies, setHiddenAgencies] = useState<Set<string> | null>(initialShowRoutes ? new Set() : null);
  const [showStops, setShowStops] = useState(initialShowStops);
  const [showHeat, setShowHeat] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute | null>(null);
  const [routeIndex, setRouteIndex] = useState<TransitRouteSummary[] | null>(null);
  const [routeQuery, setRouteQuery] = useState("");
  // Popup bodies are React portals into these stable elements.
  const [routePopupEl] = useState(() => document.createElement("div"));
  const [markerPopupEl] = useState(() => document.createElement("div"));
  const routePopupRef = useRef<{ popup: maplibregl.Popup } | null>(null);
  const markerPopupRef = useRef<{ popup: maplibregl.Popup; silent: boolean } | null>(null);

  // Operators present in the route data, in feed order, with route counts.
  const agencyRouteCounts = useMemo(() => {
    const byAgency = new Map<string, Set<string>>();
    for (const l of routeLines) {
      let set = byAgency.get(l.agencyId);
      if (!set) byAgency.set(l.agencyId, (set = new Set()));
      set.add(l.gtfsRouteId);
    }
    // BEST (the city operator) first, then agency.txt order.
    const rank = (id: string) => (id === "BEST" ? -1 : gtfsAgencies.findIndex((a) => a.agencyId === id));
    return [...byAgency.entries()]
      .sort(([a], [b]) => rank(a) - rank(b))
      .map(([agencyId, set]) => ({ agencyId, routes: set.size }));
  }, [routeLines]);
  const allAgencyIds = useMemo(() => agencyRouteCounts.map((a) => a.agencyId), [agencyRouteCounts]);
  const hidden = hiddenAgencies ?? new Set(allAgencyIds);
  const anyRoutesVisible = allAgencyIds.some((id) => !hidden.has(id));

  const kindCounts = useMemo(() => {
    const counts = new Map<MapMarkerKind, number>();
    for (const m of markers) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
    return counts;
  }, [markers]);
  const kindsPresent = KIND_ORDER.filter((k) => kindCounts.has(k));

  const visibleMarkers = useMemo(() => markers.filter((m) => !hiddenKinds.has(m.kind)), [markers, hiddenKinds]);
  markersByIdRef.current = useMemo(() => new Map(markers.map((m) => [m.id, m])), [markers]);

  function elementFor(id: string): HTMLDivElement {
    let el = markerElementsRef.current.get(id);
    if (!el) {
      el = document.createElement("div");
      el.dataset.markerId = id;
      markerElementsRef.current.set(id, el);
    }
    return el;
  }

  function fitMarkers(map: MapLibreMap, all: MapMarker[], animate: boolean) {
    const list = all.filter((m) => !m.excludeFromFit);
    if (list.length === 0) {
      map.jumpTo({ center: MUMBAI_METROPOLITAN_CENTER, zoom: DEFAULT_ZOOM });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    list.forEach((m) => bounds.extend([m.longitude, m.latitude]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: animate && !prefersReducedMotion() ? 600 : 0 });
  }

  // Map lifecycle — created once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: LIGHT_VECTOR_STYLE_URL,
      center: MUMBAI_METROPOLITAN_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    mapRef.current = map;

    tooltipRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 18,
      className: "fd-map-tooltip",
      maxWidth: "260px",
    });

    // Fall back to raster tiles if the vector style itself can't load.
    let styleLoadedOnce = false;
    let fellBack = false;
    map.on("error", () => {
      if (!styleLoadedOnce && !fellBack) {
        fellBack = true;
        map.setStyle(OSM_RASTER_STYLE);
      }
    });

    // (Re)install Fleet Drishti's own sources/layers whenever a style
    // finishes loading — idempotent, and survives the raster fallback.
    function installLayers() {
      styleLoadedOnce = true;
      if (!map.getSource(HEAT_SOURCE_ID)) {
        map.addSource(HEAT_SOURCE_ID, { type: "geojson", data: heatToGeoJSON(heatRef.current) });
        map.addLayer({
          id: HEAT_LAYER_ID,
          type: "heatmap",
          source: HEAT_SOURCE_ID,
          paint: {
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 1, 12, 1.8, 15, 2.6],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 14, 11, 24, 13, 36, 15, 52],
            "heatmap-opacity": 0.85,
            "heatmap-color": heatRampRef.current === "congestion" ? CONGESTION_HEAT_COLOR : RISK_HEAT_COLOR,
          },
        });
      }
      if (!map.getSource(NETWORK_ROUTES_SOURCE_ID)) {
        map.addSource(NETWORK_ROUTES_SOURCE_ID, { type: "geojson", data: routeLinesToGeoJSON(routeLinesRef.current) });
        // Thin, agency-tinted, low-opacity context: dense corridors emerge
        // where many routes overlap, without drowning the markers.
        const width: maplibregl.ExpressionSpecification = [
          "interpolate", ["linear"], ["zoom"],
          NETWORK_ROUTES_ZOOM_STOPS.faint, 0.5,
          NETWORK_ROUTES_ZOOM_STOPS.cityView, 0.8,
          NETWORK_ROUTES_ZOOM_STOPS.midZoom, 1.2,
          NETWORK_ROUTES_ZOOM_STOPS.closeZoom, 1.6,
          NETWORK_ROUTES_ZOOM_STOPS.fullDetail, 2.2,
        ];
        const opacity: maplibregl.ExpressionSpecification = [
          "interpolate", ["linear"], ["zoom"],
          NETWORK_ROUTES_ZOOM_STOPS.faint, 0.1,
          NETWORK_ROUTES_ZOOM_STOPS.cityView, 0.2,
          NETWORK_ROUTES_ZOOM_STOPS.midZoom, 0.38,
          NETWORK_ROUTES_ZOOM_STOPS.closeZoom, 0.7,
          NETWORK_ROUTES_ZOOM_STOPS.fullDetail, 0.85,
        ];
        map.addLayer({
          id: NETWORK_ROUTES_LAYER_ID,
          type: "line",
          source: NETWORK_ROUTES_SOURCE_ID,
          filter: ["==", ["get", "geometryType"], "road_snapped"],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": AGENCY_COLOR_EXPR, "line-width": width, "line-opacity": opacity },
        });
        // Schematic (stop-sequence) lines are dashed so they never read as
        // real road geometry.
        map.addLayer({
          id: NETWORK_ROUTES_SCHEMATIC_LAYER_ID,
          type: "line",
          source: NETWORK_ROUTES_SOURCE_ID,
          filter: ["==", ["get", "geometryType"], "approximate_stop_sequence"],
          layout: { "line-join": "round" },
          // Dimmer than road geometry: overlapping straight stop-to-stop
          // legs read as clutter much faster than real road paths do.
          paint: {
            "line-color": AGENCY_COLOR_EXPR,
            "line-width": width,
            "line-opacity": [
              "interpolate", ["linear"], ["zoom"],
              NETWORK_ROUTES_ZOOM_STOPS.faint, 0.07,
              NETWORK_ROUTES_ZOOM_STOPS.cityView, 0.13,
              NETWORK_ROUTES_ZOOM_STOPS.midZoom, 0.25,
              NETWORK_ROUTES_ZOOM_STOPS.closeZoom, 0.45,
              NETWORK_ROUTES_ZOOM_STOPS.fullDetail, 0.55,
            ],
            "line-dasharray": [2, 1.5],
          },
        });
        map.addLayer({
          id: NETWORK_ROUTES_HIGHLIGHT_LAYER_ID,
          type: "line",
          source: NETWORK_ROUTES_SOURCE_ID,
          filter: highlightFilter(),
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": NETWORK_HIGHLIGHT_COLOR, "line-width": 4.5, "line-opacity": 0.95 },
        });
      }
      syncRaster(map, rasterRef.current);
      if (!map.getSource(CONGESTION_SOURCE_ID)) {
        map.addSource(CONGESTION_SOURCE_ID, { type: "geojson", data: segmentsToGeoJSON(segmentsRef.current) });
        // `zoom` may only drive a top-level interpolate, so the per-feature
        // emphasis factor goes inside each stop.
        // Thin per-carriageway lines that only fade in once zoomed in; at
        // city scale the heat raster carries the picture.
        const k: maplibregl.ExpressionSpecification = ["case", ["==", ["get", "emphasis"], 1], 1.6, 1];
        const widthAt = (extra: number): maplibregl.ExpressionSpecification => [
          "interpolate", ["linear"], ["zoom"],
          11, ["+", ["*", 0.6, k], extra],
          13, ["+", ["*", 1.6, k], extra],
          15, ["+", ["*", 3, k], extra],
          17, ["+", ["*", 5, k], extra],
        ];
        const width = widthAt(0);
        map.addLayer({
          id: CONGESTION_CASING_LAYER_ID,
          type: "line",
          source: CONGESTION_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": widthAt(1.5),
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13.5, 0.6],
          },
        });
        map.addLayer({
          id: CONGESTION_LAYER_ID,
          type: "line",
          source: CONGESTION_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "weight"] },
          paint: {
            "line-width": width,
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 11.5, 0, 13.5, 0.9],
            "line-color": ["interpolate", ["linear"], ["get", "weight"], 0, "#2fae63", 0.35, "#d6c93a", 0.55, "#f0922b", 0.75, "#e13c2c", 1, "#b91c1c"],
          },
        });
      }
      if (!map.getSource(NETWORK_STOPS_SOURCE_ID)) {
        map.addSource(NETWORK_STOPS_SOURCE_ID, { type: "geojson", data: stopsToGeoJSON(stopsRef.current) });
        // Hubs city-wide, busy stops mid zoom, every stop close in.
        ([1, 2, 3] as const).forEach((tier, i) => {
          map.addLayer({
            id: STOP_LAYER_IDS[i],
            type: "circle",
            source: NETWORK_STOPS_SOURCE_ID,
            minzoom: STOP_TIER_MIN_ZOOM[tier],
            filter: ["==", ["get", "tier"], tier],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, tier === 1 ? 2.2 : 1.6, 15, tier === 1 ? 4 : 3],
              "circle-color": "#ffffff",
              "circle-stroke-width": tier === 1 ? 1.4 : 1,
              "circle-stroke-color": NETWORK_COLOR,
              "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.7, 14, 1],
            },
          });
        });
        // Names only close in — and only when the basemap ships glyphs
        // (the raster fallback style doesn't).
        if (map.getStyle().glyphs) {
          map.addLayer({
            id: STOP_LABEL_LAYER_ID,
            type: "symbol",
            source: NETWORK_STOPS_SOURCE_ID,
            minzoom: STOP_LABEL_MIN_ZOOM,
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 10.5,
              "text-offset": [0, 0.9],
              "text-anchor": "top",
              "text-max-width": 9,
              "text-optional": true,
            },
            paint: { "text-color": "#475467", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
          });
        }
      }
      setStyleReady((n) => n + 1);
    }
    map.on("style.load", installLayers);

    // The highlighted route: hovered, else the page's (a BEST short name),
    // else whichever the viewer opened, else nothing. Matched by route id so
    // both directions light up and same-numbered routes of other operators
    // don't.
    function highlightFilter(hoverRouteId?: string): maplibregl.FilterSpecification {
      if (hoverRouteId) return ["==", ["get", "gtfsRouteId"], hoverRouteId];
      if (highlightRouteIdRef.current) return ["==", ["get", "gtfsRouteId"], highlightRouteIdRef.current];
      if (highlightRouteRef.current) {
        return ["all", ["==", ["get", "agencyId"], "BEST"], ["==", ["get", "shortName"], highlightRouteRef.current]];
      }
      return ["==", ["get", "gtfsRouteId"], selectedRouteIdRef.current ?? NONE];
    }
    highlightFilterRef.current = highlightFilter;

    for (const layerId of ROUTE_LAYER_IDS) {
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mousemove", layerId, (e: MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, highlightFilter(props.gtfsRouteId));
        tooltipRef.current?.setLngLat(e.lngLat).setDOMContent(tooltipNode(`${props.agencyId} · Route ${props.shortName}`, props.longName)).addTo(map);
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
        tooltipRef.current?.remove();
        map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, highlightFilter());
      });
      map.on("click", layerId, (e: MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        openRouteRef.current({
          gtfsRouteId: props.gtfsRouteId,
          agencyId: props.agencyId,
          shortName: props.shortName,
          longName: props.longName,
          fromStop: props.fromStop,
          toStop: props.toStop,
          geometryType: props.geometryType,
          repairedLegs: Number(props.repairedLegs) || 0,
          lngLat: [e.lngLat.lng, e.lngLat.lat],
        });
      });
    }

    // A click on empty map (no route or stop under it) dismisses callouts.
    // Marker clicks never get here — markers stop propagation.
    map.on("click", (e) => {
      const interactive = [...ROUTE_LAYER_IDS, ...STOP_LAYER_IDS].filter((id) => map.getLayer(id));
      if (map.queryRenderedFeatures(e.point, { layers: interactive }).length > 0) return;
      openRouteRef.current(null);
      if (markerPopupRef.current?.popup.isOpen()) onSelectRef.current?.(null);
    });

    let stopPopup: maplibregl.Popup | null = null;
    for (const layerId of STOP_LAYER_IDS) {
      map.on("mouseenter", layerId, (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const props = e.features?.[0]?.properties;
        if (props) tooltipRef.current?.setLngLat(e.lngLat).setDOMContent(tooltipNode(props.name, props.agencies)).addTo(map);
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
        tooltipRef.current?.remove();
      });
      map.on("click", layerId, (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
        stopPopup?.remove();
        stopPopup = new maplibregl.Popup({ className: "fd-map-popup", maxWidth: "260px" })
          .setLngLat([lng, lat])
          .setDOMContent(stopPopupNode({ name: f.properties.name, agencies: f.properties.agencies, routes: Number(f.properties.routes) }))
          .addTo(map);
      });
    }

    // maplibre-gl.css forces `.maplibregl-map { position: relative }`, which
    // defeats percentage sizing in some layouts — size from the wrapper box.
    const wrapper = wrapperRef.current;
    let firstMeasure = true;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !containerRef.current) return;
      const { width, height } = entry.contentRect;
      containerRef.current.style.width = `${width}px`;
      containerRef.current.style.height = `${height}px`;
      if (firstMeasure) {
        firstMeasure = false;
        if (width < 640) setPanelOpen(false);
      }
      map.resize();
    });
    if (wrapper) resizeObserver.observe(wrapper);

    const instances = markerInstancesRef.current;
    return () => {
      resizeObserver.disconnect();
      tooltipRef.current?.remove();
      stopPopup?.remove();
      routePopupRef.current?.popup.remove();
      if (markerPopupRef.current) {
        markerPopupRef.current.silent = true;
        markerPopupRef.current.popup.remove();
      }
      instances.forEach((m) => m.remove());
      instances.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Data sync for GeoJSON sources.
  useEffect(() => {
    (mapRef.current?.getSource(NETWORK_STOPS_SOURCE_ID) as GeoJSONSource | undefined)?.setData(stopsToGeoJSON(stops));
  }, [stops, styleReady]);
  useEffect(() => {
    (mapRef.current?.getSource(NETWORK_ROUTES_SOURCE_ID) as GeoJSONSource | undefined)?.setData(routeLinesToGeoJSON(routeLines));
  }, [routeLines, styleReady]);
  useEffect(() => {
    (mapRef.current?.getSource(HEAT_SOURCE_ID) as GeoJSONSource | undefined)?.setData(heatToGeoJSON(heatmap?.points ?? []));
  }, [heatmap?.points, styleReady]);
  useEffect(() => {
    (mapRef.current?.getSource(CONGESTION_SOURCE_ID) as GeoJSONSource | undefined)?.setData(segmentsToGeoJSON(congestionSegments ?? []));
  }, [congestionSegments, styleReady]);
  useEffect(() => {
    const map = mapRef.current;
    if (map && styleReady) syncRaster(map, rasterOverlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rasterOverlay?.url, styleReady]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer(HEAT_LAYER_ID)) return;
    map.setPaintProperty(HEAT_LAYER_ID, "heatmap-color", heatmap?.ramp === "congestion" ? CONGESTION_HEAT_COLOR : RISK_HEAT_COLOR);
  }, [heatmap?.ramp, styleReady]);

  // Callout cards pinned to locations; their React content is portalled in.
  function calloutElFor(key: string, side: "left" | "right"): HTMLDivElement {
    const existing = calloutMarkersRef.current.get(key);
    if (existing) return existing.el;
    const el = document.createElement("div");
    el.style.zIndex = "4";
    el.style.pointerEvents = "none";
    const marker = new maplibregl.Marker({ element: el, anchor: side === "left" ? "right" : "left", offset: [side === "left" ? -20 : 20, 0] });
    calloutMarkersRef.current.set(key, { marker, el });
    return el;
  }
  const calloutSignature = (callouts ?? []).map((c) => `${c.key}@${c.longitude},${c.latitude}`).join("|");
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const wanted = new Map((callouts ?? []).map((c) => [c.key, c]));
    calloutMarkersRef.current.forEach((entry, key) => {
      if (!wanted.has(key)) {
        entry.marker.remove();
        calloutMarkersRef.current.delete(key);
      }
    });
    wanted.forEach((c) => {
      calloutElFor(c.key, c.side ?? "right");
      calloutMarkersRef.current.get(c.key)?.marker.setLngLat([c.longitude, c.latitude]).addTo(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calloutSignature, styleReady]);

  // Layer visibility: routes per operator, stops, heat layers.
  const hiddenKey = [...hidden].sort().join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const set = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    const hiddenIds = hiddenKey ? hiddenKey.split(",") : [];
    for (const id of ROUTE_LAYER_IDS) {
      set(id, anyRoutesVisible);
      if (map.getLayer(id)) {
        const geometry = id === NETWORK_ROUTES_LAYER_ID ? "road_snapped" : "approximate_stop_sequence";
        map.setFilter(id, ["all", ["==", ["get", "geometryType"], geometry], ["!", ["in", ["get", "agencyId"], ["literal", hiddenIds]]]]);
      }
    }
    set(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, true);
    for (const id of [...STOP_LAYER_IDS, STOP_LABEL_LAYER_ID]) set(id, showStops);
    set(HEAT_LAYER_ID, showHeat && Boolean(heatmap));
    set(RASTER_LAYER_ID, showHeat && Boolean(rasterOverlay));
    set(CONGESTION_CASING_LAYER_ID, showHeat && Boolean(congestionSegments?.length));
    set(CONGESTION_LAYER_ID, showHeat && Boolean(congestionSegments?.length));
  }, [hiddenKey, anyRoutesVisible, showStops, showHeat, heatmap, rasterOverlay, congestionSegments, styleReady]);

  // Opening a route (line click or search): highlight both directions and
  // pin the route card. Route facts load once, on first use.
  openRouteRef.current = (route) => {
    selectedRouteIdRef.current = route?.gtfsRouteId ?? null;
    setSelectedRoute(route);
    const map = mapRef.current;
    if (map?.getLayer(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID)) map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, highlightFilterRef.current());
  };
  useEffect(() => {
    if ((selectedRoute || routeQuery) && !routeIndex) routeService.listRouteIndex().then(setRouteIndex).catch(() => undefined);
  }, [selectedRoute, routeQuery, routeIndex]);

  // Route card popup — a MapLibre popup whose body is a React portal.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedRoute) {
      routePopupRef.current?.popup.remove();
      return;
    }
    if (!routePopupRef.current) {
      const popup = new maplibregl.Popup({ className: "fd-map-popup", maxWidth: "280px", closeButton: false, closeOnClick: false });
      popup.setDOMContent(routePopupEl);
      routePopupRef.current = { popup };
    }
    const { popup } = routePopupRef.current;
    popup.setLngLat(selectedRoute.lngLat);
    // Never show an empty box: only open once the callout has rendered.
    if (!popup.isOpen() && routePopupEl.childElementCount > 0) popup.addTo(map);
  }, [selectedRoute, routePopupEl]);

  // Marker popup (e.g. bus details) pinned to the selected marker.
  const selectedMarker = selectedId ? markers.find((m) => m.id === selectedId) : undefined;
  const markerPopupContent = selectedMarker && markerPopup ? markerPopup(selectedMarker, () => onSelectRef.current?.(null)) : null;
  const markerPopupAt = markerPopupContent && selectedMarker ? `${selectedMarker.longitude},${selectedMarker.latitude}` : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerPopupAt) {
      const entry = markerPopupRef.current;
      if (entry?.popup.isOpen()) {
        entry.silent = true; // programmatic: keep the page's selection
        entry.popup.remove();
        entry.silent = false;
      }
      return;
    }
    if (!markerPopupRef.current) {
      const popup = new maplibregl.Popup({ className: "fd-map-popup", maxWidth: "280px", offset: 20, closeButton: false, closeOnClick: false });
      popup.setDOMContent(markerPopupEl);
      popup.on("close", () => {
        if (!markerPopupRef.current?.silent) onSelectRef.current?.(null);
      });
      markerPopupRef.current = { popup, silent: false };
    }
    const [lng, lat] = markerPopupAt.split(",").map(Number);
    const { popup } = markerPopupRef.current;
    popup.setLngLat([lng, lat]);
    // Popup.addTo() on an open popup removes it first (firing "close"),
    // which would clear the new selection — only add when closed. And never
    // show an empty box: only open once the callout has rendered.
    if (!popup.isOpen() && markerPopupEl.childElementCount > 0) popup.addTo(map);
  }, [markerPopupAt, markerPopupEl]);

  // Page-driven route highlight: filter + fit to the route.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID)) return;
    map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, highlightFilterRef.current());
    if ((!highlightRoute && !highlightRouteId) || !fitHighlightedRoute) return;
    const coords = routeLines
      .filter((l) =>
        highlightRouteId ? l.gtfsRouteId === highlightRouteId : l.agencyId === "BEST" && l.shortName === highlightRoute,
      )
      .flatMap((l) => l.geometry.coordinates);
    if (coords.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    coords.forEach((c) => bounds.extend(c));
    const wide = map.getContainer().clientWidth >= 640;
    const padding = drawerOpen && wide ? { top: 60, bottom: 60, left: 60, right: 400 } : 60;
    map.fitBounds(bounds, { padding, maxZoom: 14, duration: prefersReducedMotion() ? 0 : 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRoute, highlightRouteId, routeLines, styleReady]);

  // Marker instances — diffed by id. The glyph inside each element is
  // rendered by React through a portal (see return).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const instances = markerInstancesRef.current;
    const currentIds = new Set(visibleMarkers.map((m) => m.id));

    instances.forEach((instance, id) => {
      if (!currentIds.has(id)) {
        instance.remove();
        instances.delete(id);
      }
    });

    visibleMarkers.forEach((marker) => {
      const existing = instances.get(marker.id);
      if (existing) {
        existing.setLngLat([marker.longitude, marker.latitude]);
        return;
      }
      const el = elementFor(marker.id);
      el.style.cursor = "pointer";
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", marker.detail ? `${marker.label}, ${marker.detail}` : marker.label);

      const activate = (event: Event) => {
        event.stopPropagation();
        const current = markersByIdRef.current.get(marker.id);
        if (!current) return;
        if (onSelectRef.current) onSelectRef.current(current.id);
        else if (current.href) navigateRef.current(current.href);
      };
      el.addEventListener("click", activate);
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") activate(event);
      });
      const showTip = () => {
        const current = markersByIdRef.current.get(marker.id);
        if (!current) return;
        const position = current.positionSource === "DEMO" ? "Demo position" : "Simulated position";
        const detail = current.kind === "bus-probe" ? [current.detail, position].filter(Boolean).join(" · ") : current.detail;
        tooltipRef.current?.setLngLat([current.longitude, current.latitude]).setDOMContent(tooltipNode(current.label, detail)).addTo(map);
      };
      el.addEventListener("mouseenter", showTip);
      el.addEventListener("focus", showTip);
      el.addEventListener("mouseleave", () => tooltipRef.current?.remove());
      el.addEventListener("blur", () => tooltipRef.current?.remove());

      instances.set(
        marker.id,
        new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([marker.longitude, marker.latitude]).addTo(map),
      );
    });

    // Drop elements for markers that no longer exist at all.
    markerElementsRef.current.forEach((_, id) => {
      if (!markersByIdRef.current.has(id)) markerElementsRef.current.delete(id);
    });
  }, [visibleMarkers]);

  // Keep the selected / hovered marker on top.
  useEffect(() => {
    markerElementsRef.current.forEach((el, id) => {
      el.style.zIndex = id === selectedId ? "3" : id === hoveredId ? "2" : "";
    });
  }, [selectedId, hoveredId, visibleMarkers]);

  // Selection → fly to it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId || !flyToSelection) return;
    const marker = markersByIdRef.current.get(selectedId);
    if (!marker) return;
    const width = map.getContainer().clientWidth;
    const padding = drawerOpen
      ? width >= 640
        ? { top: 0, bottom: 0, left: 0, right: 360 }
        : { top: 0, bottom: map.getContainer().clientHeight * 0.45, left: 0, right: 0 }
      : undefined;
    const target = { center: [marker.longitude, marker.latitude] as [number, number], zoom: Math.max(map.getZoom(), 13.5), padding };
    if (prefersReducedMotion()) map.jumpTo(target);
    else map.flyTo({ ...target, duration: 800, essential: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Arbitrary focus point → fly to it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const target = { center: [focus.longitude, focus.latitude] as [number, number], zoom: focus.zoom ?? Math.max(map.getZoom(), 13) };
    if (prefersReducedMotion()) map.jumpTo(target);
    else map.flyTo({ ...target, duration: 800, essential: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  // Initial fit.
  const didFitRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitToMarkers || didFitRef.current || markers.length === 0) return;
    // Page data arrives in several async batches — fit once it settles.
    const timer = window.setTimeout(() => {
      didFitRef.current = true;
      fitMarkers(map, markers, false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fitToMarkers, markers]);

  function toggleAgency(agencyId: string) {
    setHiddenAgencies((prev) => {
      const next = new Set(prev ?? allAgencyIds);
      if (next.has(agencyId)) next.delete(agencyId);
      else next.add(agencyId);
      return next;
    });
  }

  // Route search over the GTFS route index (routes that have geometry).
  const searchResults = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    if (!q || !routeIndex) return [];
    const hits = routeIndex.filter(
      (r) => r.geometryType && (r.shortName.toLowerCase().startsWith(q) || r.longName.toLowerCase().includes(q)),
    );
    // Exact route numbers first, then prefix matches, then name matches.
    const score = (r: TransitRouteSummary) => (r.shortName.toLowerCase() === q ? 0 : r.shortName.toLowerCase().startsWith(q) ? 1 : 2);
    return hits.sort((a, b) => score(a) - score(b) || a.shortName.length - b.shortName.length).slice(0, 8);
  }, [routeQuery, routeIndex]);

  function pickRoute(r: TransitRouteSummary) {
    const map = mapRef.current;
    const line = routeLines.find((l) => l.gtfsRouteId === r.gtfsRouteId);
    if (!map || !line || !r.bbox) return;
    // Turn the operator layer on so the route sits in context.
    setHiddenAgencies((prev) => {
      const next = new Set(prev ?? allAgencyIds);
      next.delete(r.agencyId);
      return next;
    });
    const coords = line.geometry.coordinates;
    const mid = coords[Math.floor(coords.length / 2)];
    openRouteRef.current({
      gtfsRouteId: r.gtfsRouteId,
      agencyId: r.agencyId,
      shortName: r.shortName,
      longName: r.longName,
      fromStop: line.fromStop,
      toStop: line.toStop,
      geometryType: line.geometryType,
      repairedLegs: line.repairedLegs,
      lngLat: [mid[0], mid[1]],
    });
    map.fitBounds(
      [
        [r.bbox[0], r.bbox[1]],
        [r.bbox[2], r.bbox[3]],
      ],
      { padding: { top: 80, bottom: 80, left: 260, right: 80 }, maxZoom: 14, duration: prefersReducedMotion() ? 0 : 700 },
    );
    setRouteQuery("");
  }

  const routeBuses = selectedRoute
    ? markers.filter((m) => m.kind === "bus-probe" && m.gtfsRouteId === selectedRoute.gtfsRouteId)
    : [];

  function toggleKind(kind: MapMarkerKind) {
    setHiddenKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  const hasNetwork = routeLines.length > 0 || stops.length > 0;

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-xl border border-line bg-surface-2", className)}>
      <div ref={wrapperRef} className="absolute inset-0" role="region" aria-label={ariaLabel}>
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {visibleMarkers.map((marker) =>
        createPortal(
          <MarkerGlyph marker={marker} selected={marker.id === selectedId} hovered={marker.id === hoveredId} />,
          elementFor(marker.id),
          marker.id,
        ),
      )}

      {showLayerPanel && (kindsPresent.length > 0 || hasNetwork || heatmap || rasterOverlay) && (
        <div className="absolute top-3 left-3 z-10 w-[212px] max-w-[calc(100%-4.5rem)] rounded-[10px] bg-surface shadow-float">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            className="flex w-full items-center gap-2 px-3 h-10 text-item text-ink"
          >
            <Layers size={16} className="text-ink-2" aria-hidden="true" />
            <span className="flex-1 text-left">Layers</span>
            <ChevronDown size={16} className={cn("text-ink-3 transition-transform duration-200", panelOpen && "rotate-180")} aria-hidden="true" />
          </button>
          {panelOpen && (
            <div className="border-t border-line px-2 py-1.5 flex flex-col max-h-[60vh] overflow-y-auto">
              {routeSearch && routeLines.length > 0 && (
                <RouteSearch
                  query={routeQuery}
                  onQuery={setRouteQuery}
                  results={searchResults}
                  loading={Boolean(routeQuery) && !routeIndex}
                  onPick={pickRoute}
                />
              )}
              {(heatmap || rasterOverlay) && (
                <LayerToggle
                  checked={showHeat}
                  onChange={() => setShowHeat((v) => !v)}
                  label={heatmap?.label ?? rasterOverlay?.label ?? ""}
                  swatch={<Flame size={15} className="text-watch-ink" />}
                />
              )}
              {kindsPresent.map((kind) => {
                const meta = KIND_META[kind];
                const Icon = meta.icon;
                return (
                  <LayerToggle
                    key={kind}
                    checked={!hiddenKinds.has(kind)}
                    onChange={() => toggleKind(kind)}
                    label={meta.label}
                    count={kindCounts.get(kind)}
                    swatch={
                      <span className={cn("flex h-5 w-5 items-center justify-center text-white", kind === "bus-probe" ? "rounded" : "rounded-full", TONE_CLASSES[meta.tone].solid)}>
                        <Icon size={11} strokeWidth={2.25} />
                      </span>
                    }
                  />
                );
              })}
              {agencyRouteCounts.map(({ agencyId, routes }) => (
                <LayerToggle
                  key={agencyId}
                  checked={!hidden.has(agencyId)}
                  onChange={() => toggleAgency(agencyId)}
                  label={`${agencyId} routes`}
                  count={routes}
                  swatch={<span className="block h-[3px] w-4 rounded-full" style={{ background: AGENCY_ROUTE_COLORS[agencyId] ?? NETWORK_COLOR }} />}
                />
              ))}
              {stops.length > 0 && (
                <LayerToggle
                  checked={showStops}
                  onChange={() => setShowStops((v) => !v)}
                  label="Transit stops"
                  count={stops.length}
                  swatch={<span className="block h-2.5 w-2.5 rounded-full border-2 border-network bg-surface" />}
                />
              )}
              {routeLines.length > 0 && (
                <p className="px-1 pt-1 text-micro font-medium text-ink-3">GTFS network · scheduled, not live</p>
              )}
              {legend && <div className="border-t border-line mt-1.5 pt-2 px-1 pb-1">{legend}</div>}
            </div>
          )}
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded-[10px] bg-surface shadow-float divide-y divide-line">
        <RailButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Plus size={17} />
        </RailButton>
        <RailButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Minus size={17} />
        </RailButton>
        <RailButton
          label={fitToMarkers ? "Fit to results" : "Recenter on Mumbai"}
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            if (fitToMarkers) fitMarkers(map, visibleMarkers, true);
            else map.flyTo({ center: MUMBAI_METROPOLITAN_CENTER, zoom: DEFAULT_ZOOM, duration: prefersReducedMotion() ? 0 : 800 });
          }}
        >
          <Crosshair size={16} />
        </RailButton>
        {expandHref && (
          <Link
            to={expandHref}
            aria-label="Open full map"
            title="Open full map"
            className="h-9 w-9 inline-flex items-center justify-center text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <Maximize2 size={15} />
          </Link>
        )}
      </div>

      {(callouts ?? []).map((c) => createPortal(c.content, calloutElFor(c.key, c.side ?? "right"), c.key))}

      {selectedRoute &&
        createPortal(
          <RouteCallout
            route={selectedRoute}
            summary={routeIndex?.find((r) => r.gtfsRouteId === selectedRoute.gtfsRouteId)}
            indexLoaded={Boolean(routeIndex)}
            sensingBuses={{
              simulated: routeBuses.filter((b) => b.positionSource !== "DEMO").length,
              demo: routeBuses.filter((b) => b.positionSource === "DEMO").length,
            }}
            onClose={() => openRouteRef.current(null)}
          />,
          routePopupEl,
        )}
      {markerPopupContent && createPortal(markerPopupContent, markerPopupEl)}

      {overlay}
    </div>
  );
}

// Same wrapper markup GISMapCanvas uses, so the fallback occupies exactly
// the space the real map would (no layout shift for callers that size it
// via `className`, e.g. h-[480px] / xl:h-full).
function MapUnavailable({ className, message }: { className?: string; message: string }) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-xl border border-line bg-surface-2", className)}>
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <p className="text-body text-ink-3 max-w-[32ch]">{message}</p>
      </div>
    </div>
  );
}

// Public entry point. A map failure — WebGL2 unavailable, a MapLibre
// internal error, a bad response, malformed GeoJSON, anything — must never
// take down the rest of the app (sidebar, nav, every other page). Two
// layers of defense:
//   1. A proactive WebGL2 check, so the common case (WebGL disabled/
//      unsupported) never even attempts MapLibre's init code.
//   2. An error boundary around the real map, so any other unexpected
//      failure is contained to this component instead of unmounting React.
export function GISMap(props: GISMapProps) {
  if (!isWebGL2Supported()) {
    return <MapUnavailable className={props.className} message="Map unavailable — your browser doesn't support WebGL2." />;
  }

  return (
    <ErrorBoundary
      fallback={<MapUnavailable className={props.className} message="Map unavailable — something went wrong loading it." />}
    >
      <GISMapCanvas {...props} />
    </ErrorBoundary>
  );
}
