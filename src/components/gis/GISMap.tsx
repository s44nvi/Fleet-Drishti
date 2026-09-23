import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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
  ShieldAlert,
  TrafficCone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import {
  DEFAULT_ZOOM,
  LIGHT_VECTOR_STYLE_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  MUMBAI_METROPOLITAN_CENTER,
  NETWORK_ROUTES_ZOOM_STOPS,
  NETWORK_STOPS_MIN_ZOOM,
  OSM_RASTER_STYLE,
} from "../../lib/gisConfig";
import { gtfsSourceInfo } from "../../lib/gtfs/adapter";
import { SEVERITY_TONE, TONE_CLASSES, TONE_HEX, categoryVisual, type Tone } from "../../lib/visuals";
import type { MapMarker, MapMarkerKind, NetworkRouteLine, TransitStop } from "../../types";

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

export interface HeatPoint {
  longitude: number;
  latitude: number;
  /** 0..1 */
  weight: number;
}

interface GISMapProps {
  markers: MapMarker[];
  /** Real BEST stop network (GTFS) — zoom-gated reference layer. */
  stops?: TransitStop[];
  /** Real BEST route paths (approximate, stop-sequence derived). */
  routeLines?: NetworkRouteLine[];
  /** BEST route short name ("9") to highlight in both directions; the map
   * fits to it when it changes. */
  highlightRoute?: string | null;
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
const NETWORK_STOPS_LAYER_ID = "fd-network-stops-layer";
const NETWORK_ROUTES_SOURCE_ID = "fd-network-routes";
const NETWORK_ROUTES_LAYER_ID = "fd-network-routes-layer";
const NETWORK_ROUTES_HIGHLIGHT_LAYER_ID = "fd-network-routes-highlight";
const HEAT_SOURCE_ID = "fd-heat";
const HEAT_LAYER_ID = "fd-heat-layer";
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

const NETWORK_COLOR = "#8fa3bf";
const NETWORK_HIGHLIGHT_COLOR = TONE_HEX.action;

const KIND_META: Record<MapMarkerKind, { label: string; icon: LucideIcon; tone: Tone; category: string }> = {
  "bus-probe": { label: "Buses", icon: Bus, tone: "ok", category: "bus" },
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

function markerTone(marker: MapMarker): Tone {
  if (marker.tone) return marker.tone;
  if (marker.intensity) return SEVERITY_TONE[marker.intensity];
  return KIND_META[marker.kind].tone;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function stopsToGeoJSON(stops: TransitStop[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stops.map((stop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [stop.longitude, stop.latitude] },
      properties: { name: stop.name },
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
        shortName: line.shortName,
        longName: line.longName,
        distanceKm: line.distanceKm,
      },
    })),
  };
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

function routePopupNode(props: { shortName: string; longName: string; distanceKm: number }): HTMLElement {
  const root = document.createElement("div");
  root.className = "text-body text-ink max-w-[240px]";
  const title = document.createElement("p");
  title.className = "text-item";
  title.textContent = `BEST route ${props.shortName}`;
  const name = document.createElement("p");
  name.className = "text-meta text-ink-2 mt-0.5";
  name.textContent = props.longName;
  const note = document.createElement("p");
  note.className = "text-meta text-ink-3 mt-1.5";
  note.textContent = `≈ ${props.distanceKm} km · approximate path from stop sequence · community GTFS feed (${gtfsSourceInfo.repository.replace("https://github.com/", "")}), not an official BEST publication`;
  root.append(title, name, note);
  return root;
}

function MarkerGlyph({ marker, selected, hovered }: { marker: MapMarker; selected: boolean; hovered: boolean }) {
  const tone = markerTone(marker);
  const Icon = categoryVisual(marker.category ?? KIND_META[marker.kind].category).icon;
  const isBus = marker.kind === "bus-probe";
  const size = selected ? 32 : 26;
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
        <Icon size={selected ? 17 : 14} strokeWidth={2.25} aria-hidden="true" />
      </span>
    </span>
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
export function GISMap({
  markers,
  stops = [],
  routeLines = [],
  highlightRoute = null,
  selectedId = null,
  hoveredId = null,
  onSelect,
  flyToSelection = true,
  drawerOpen = false,
  heatmap,
  congestionSegments,
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
  const calloutMarkersRef = useRef<Map<string, { marker: MapLibreMarker; el: HTMLDivElement }>>(new Map());
  const selectedRouteIdRef = useRef<string | null>(null);
  const highlightRouteRef = useRef(highlightRoute);
  onSelectRef.current = onSelect;
  navigateRef.current = navigate;
  stopsRef.current = stops;
  routeLinesRef.current = routeLines;
  heatRef.current = heatmap?.points ?? [];
  heatRampRef.current = heatmap?.ramp ?? "risk";
  segmentsRef.current = congestionSegments ?? [];
  highlightRouteRef.current = highlightRoute;

  const [styleReady, setStyleReady] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [hiddenKinds, setHiddenKinds] = useState<Set<MapMarkerKind>>(new Set());
  const [showRoutes, setShowRoutes] = useState(initialShowRoutes);
  const [showStops, setShowStops] = useState(true);
  const [showHeat, setShowHeat] = useState(true);

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

  function fitMarkers(map: MapLibreMap, list: MapMarker[], animate: boolean) {
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
    let routePopup: maplibregl.Popup | null = null;

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
        map.addLayer({
          id: NETWORK_ROUTES_LAYER_ID,
          type: "line",
          source: NETWORK_ROUTES_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": NETWORK_COLOR,
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              NETWORK_ROUTES_ZOOM_STOPS.faint, 0.5,
              NETWORK_ROUTES_ZOOM_STOPS.cityView, 0.8,
              NETWORK_ROUTES_ZOOM_STOPS.midZoom, 1.2,
              NETWORK_ROUTES_ZOOM_STOPS.closeZoom, 1.6,
              NETWORK_ROUTES_ZOOM_STOPS.fullDetail, 2.2,
            ],
            "line-opacity": [
              "interpolate", ["linear"], ["zoom"],
              NETWORK_ROUTES_ZOOM_STOPS.faint, 0.06,
              NETWORK_ROUTES_ZOOM_STOPS.cityView, 0.12,
              NETWORK_ROUTES_ZOOM_STOPS.midZoom, 0.35,
              NETWORK_ROUTES_ZOOM_STOPS.closeZoom, 0.7,
              NETWORK_ROUTES_ZOOM_STOPS.fullDetail, 0.85,
            ],
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
      if (!map.getSource(CONGESTION_SOURCE_ID)) {
        map.addSource(CONGESTION_SOURCE_ID, { type: "geojson", data: segmentsToGeoJSON(segmentsRef.current) });
        // `zoom` may only drive a top-level interpolate, so the per-feature
        // emphasis factor goes inside each stop.
        const k: maplibregl.ExpressionSpecification = ["case", ["==", ["get", "emphasis"], 1], 1.7, 1];
        const widthAt = (extra: number): maplibregl.ExpressionSpecification => [
          "interpolate", ["linear"], ["zoom"],
          10, ["+", ["*", 2.2, k], extra],
          12, ["+", ["*", 3.6, k], extra],
          14, ["+", ["*", 6, k], extra],
          16, ["+", ["*", 9, k], extra],
        ];
        const width = widthAt(0);
        map.addLayer({
          id: CONGESTION_CASING_LAYER_ID,
          type: "line",
          source: CONGESTION_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#ffffff", "line-width": widthAt(2), "line-opacity": 0.75 },
        });
        map.addLayer({
          id: CONGESTION_LAYER_ID,
          type: "line",
          source: CONGESTION_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round", "line-sort-key": ["get", "weight"] },
          paint: {
            "line-width": width,
            "line-opacity": 0.95,
            "line-color": ["interpolate", ["linear"], ["get", "weight"], 0, "#2fae63", 0.35, "#d6c93a", 0.55, "#f0922b", 0.75, "#e13c2c", 1, "#b91c1c"],
          },
        });
      }
      if (!map.getSource(NETWORK_STOPS_SOURCE_ID)) {
        map.addSource(NETWORK_STOPS_SOURCE_ID, { type: "geojson", data: stopsToGeoJSON(stopsRef.current) });
        map.addLayer({
          id: NETWORK_STOPS_LAYER_ID,
          type: "circle",
          source: NETWORK_STOPS_SOURCE_ID,
          minzoom: NETWORK_STOPS_MIN_ZOOM,
          paint: {
            "circle-radius": 2.5,
            "circle-color": "#ffffff",
            "circle-stroke-width": 1.25,
            "circle-stroke-color": NETWORK_COLOR,
          },
        });
      }
      setStyleReady((n) => n + 1);
    }
    map.on("style.load", installLayers);

    // The highlighted route: the one passed by the page, otherwise whichever
    // the viewer clicked, otherwise nothing.
    function highlightFilter(hoverShortName?: string): maplibregl.FilterSpecification {
      if (hoverShortName) return ["==", ["get", "shortName"], hoverShortName];
      if (highlightRouteRef.current) return ["==", ["get", "shortName"], highlightRouteRef.current];
      return ["==", ["get", "gtfsRouteId"], selectedRouteIdRef.current ?? NONE];
    }

    map.on("mouseenter", NETWORK_ROUTES_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mousemove", NETWORK_ROUTES_LAYER_ID, (e: MapLayerMouseEvent) => {
      const props = e.features?.[0]?.properties;
      if (!props) return;
      map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, highlightFilter(props.shortName));
      tooltipRef.current?.setLngLat(e.lngLat).setDOMContent(tooltipNode(`BEST route ${props.shortName}`)).addTo(map);
    });
    map.on("mouseleave", NETWORK_ROUTES_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
      tooltipRef.current?.remove();
      map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, highlightFilter());
    });
    map.on("click", NETWORK_ROUTES_LAYER_ID, (e: MapLayerMouseEvent) => {
      const props = e.features?.[0]?.properties;
      if (!props) return;
      selectedRouteIdRef.current = props.gtfsRouteId;
      map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, highlightFilter());
      routePopup?.remove();
      routePopup = new maplibregl.Popup({ className: "fd-map-popup", maxWidth: "280px" })
        .setLngLat(e.lngLat)
        .setDOMContent(routePopupNode({ shortName: props.shortName, longName: props.longName, distanceKm: props.distanceKm }))
        .addTo(map);
    });

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
      routePopup?.remove();
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

  // Layer visibility toggles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const set = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    set(NETWORK_ROUTES_LAYER_ID, showRoutes);
    set(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, showRoutes || Boolean(highlightRoute));
    set(NETWORK_STOPS_LAYER_ID, showStops);
    set(HEAT_LAYER_ID, showHeat && Boolean(heatmap));
    set(CONGESTION_CASING_LAYER_ID, showHeat && Boolean(congestionSegments?.length));
    set(CONGESTION_LAYER_ID, showHeat && Boolean(congestionSegments?.length));
  }, [showRoutes, showStops, showHeat, heatmap, congestionSegments, highlightRoute, styleReady]);

  // Page-driven route highlight: filter + fit to the route.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID)) return;
    map.setFilter(
      NETWORK_ROUTES_HIGHLIGHT_LAYER_ID,
      highlightRoute ? ["==", ["get", "shortName"], highlightRoute] : ["==", ["get", "gtfsRouteId"], selectedRouteIdRef.current ?? NONE],
    );
    if (!highlightRoute) return;
    const coords = routeLines.filter((l) => l.shortName === highlightRoute).flatMap((l) => l.geometry.coordinates);
    if (coords.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    coords.forEach((c) => bounds.extend(c));
    const wide = map.getContainer().clientWidth >= 640;
    const padding = drawerOpen && wide ? { top: 60, bottom: 60, left: 60, right: 400 } : 60;
    map.fitBounds(bounds, { padding, maxZoom: 14, duration: prefersReducedMotion() ? 0 : 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRoute, routeLines, styleReady]);

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
        const detail = current.kind === "bus-probe" ? [current.detail, "Simulated position"].filter(Boolean).join(" · ") : current.detail;
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

      {showLayerPanel && (kindsPresent.length > 0 || hasNetwork || heatmap) && (
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
              {heatmap && (
                <LayerToggle
                  checked={showHeat}
                  onChange={() => setShowHeat((v) => !v)}
                  label={heatmap.label}
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
              {routeLines.length > 0 && (
                <LayerToggle
                  checked={showRoutes}
                  onChange={() => setShowRoutes((v) => !v)}
                  label="BEST routes"
                  swatch={<span className="block h-[3px] w-4 rounded-full bg-network" />}
                />
              )}
              {stops.length > 0 && (
                <LayerToggle
                  checked={showStops}
                  onChange={() => setShowStops((v) => !v)}
                  label="BEST stops"
                  swatch={<span className="block h-2.5 w-2.5 rounded-full border-2 border-network bg-surface" />}
                />
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

      {overlay}
    </div>
  );
}
