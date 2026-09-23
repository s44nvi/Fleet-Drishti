import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import type { IControl, Map as MapLibreMap, MapLayerMouseEvent, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "../../lib/cn";
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  MUMBAI_METROPOLITAN_CENTER,
  NETWORK_ROUTES_ZOOM_STOPS,
  NETWORK_STOPS_MIN_ZOOM,
  OSM_RASTER_STYLE,
} from "../../lib/gisConfig";
import type { MapMarker, NetworkRouteLine, TransitStop } from "../../types";
import { gtfsSourceInfo } from "../../lib/gtfs/adapter";

interface GISMapProps {
  markers: MapMarker[];
  /** Real BEST stop network data (see lib/gtfs/adapter.ts) — a separate,
   * non-interactive reference layer under the AI-observation markers.
   * Optional: omit on pages that don't need the network context. */
  stops?: TransitStop[];
  /** Real BEST route paths, approximated from stop sequences (see
   * lib/gtfs/adapter.ts) — the "this is a real transit network" backdrop
   * layer, drawn under both the stops layer and the AI-observation markers. */
  routeLines?: NetworkRouteLine[];
  title?: string;
  /** "panel" (default): the original bordered white card, used by
   * CommandCenter's dashboard-grid map tile. "floating": no outer card —
   * the map fills its container edge-to-edge and the title/legend controls
   * become a compact floating overlay instead of a header row above the
   * map. Used by the full-screen Live Map workspace; unaffected pages keep
   * "panel" by omitting this prop. */
  variant?: "panel" | "floating";
}

const NETWORK_STOPS_SOURCE_ID = "network-stops-source";
const NETWORK_STOPS_LAYER_ID = "network-stops-layer";
const NETWORK_ROUTES_SOURCE_ID = "network-routes-source";
const NETWORK_ROUTES_LAYER_ID = "network-routes-layer";
const NETWORK_ROUTES_HIGHLIGHT_LAYER_ID = "network-routes-highlight-layer";
const NO_ROUTE_SELECTED = "__none__";

function stopsToGeoJSON(stops: TransitStop[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stops.map((stop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [stop.longitude, stop.latitude] },
      properties: { name: stop.name, area: stop.area },
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

function routePopupHtml(props: { shortName: string; longName: string; distanceKm: number }): string {
  return `
    <div class="min-w-[220px] max-w-[260px] font-sans text-body-sm">
      <p class="font-bold text-ink-primary">BEST Route ${props.shortName}</p>
      <p class="mt-0.5 text-ink-secondary">${props.longName}</p>
      <p class="mt-1.5 text-ink-muted">≈ ${props.distanceKm} km · Community GTFS feed (${gtfsSourceInfo.repository.replace("https://github.com/", "")}) — not an official BEST publication</p>
      <p class="mt-1.5 text-ink-muted italic">Approximate path derived from stop sequence — this feed has no shapes.txt, so this is not official route geometry.</p>
    </div>
  `;
}

type MarkerKind = MapMarker["kind"];

const MARKER_STYLE: Record<MarkerKind, { bg: string; icon: string; label: string }> = {
  "bus-probe": { bg: "bg-primary-civic-deep", icon: "directions_bus", label: "Fleet Sensing Vehicle" },
  "critical-distress": { bg: "bg-signal-alert", icon: "report", label: "Road Issues" },
  "traffic-chokepoint": { bg: "bg-transit-warning", icon: "traffic", label: "Traffic" },
  "vulnerable-crossing": { bg: "bg-gis-vector-blue", icon: "directions_walk", label: "Safety" },
  "infrastructure-asset": { bg: "bg-ink-muted", icon: "construction", label: "Infrastructure" },
};

// Any marker can optionally carry a real severity/congestion reading (see
// MapMarker.intensity) so the pin's color communicates that instead of
// every signal of a given kind painting the same flat color — first built
// for the Traffic page's congestion "heatmap", reused as-is by Safety's
// severity-shaded incident markers. Markers without `intensity` set keep
// MARKER_STYLE's single fixed color exactly as before.
const INTENSITY_BG: Record<NonNullable<MapMarker["intensity"]>, string> = {
  low: "bg-transit-ochre/70",
  medium: "bg-transit-warning",
  high: "bg-signal-alert/80",
  critical: "bg-signal-alert",
};

// Fixed legend/filter order, independent of marker paint order.
const KIND_ORDER: MarkerKind[] = [
  "bus-probe",
  "critical-distress",
  "traffic-chokepoint",
  "vulnerable-crossing",
  "infrastructure-asset",
];

// The network layers' legend entries aren't marker kinds (they toggle
// MapLibre layer visibility, not the DOM-marker filter above), but they sit
// in the same legend row and follow the same swatch-and-label look.
const NETWORK_ROUTES_SWATCH_COLOR = "#C0266D";
const NETWORK_STOPS_SWATCH_COLOR = "#C0266D";

// A plain MapLibre IControl for "recenter on Mumbai" — kept as a small class
// (rather than a React overlay button) so it sits inside MapLibre's own
// top-left control stack alongside zoom, instead of floating separately.
class RecenterControl implements IControl {
  private container?: HTMLDivElement;
  private onClick: () => void;

  constructor(onClick: () => void) {
    this.onClick = onClick;
  }

  onAdd() {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    const button = document.createElement("button");
    button.type = "button";
    button.title = "Recenter on Mumbai";
    button.setAttribute("aria-label", "Recenter on Mumbai");
    button.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;line-height:1">my_location</span>';
    button.addEventListener("click", this.onClick);
    this.container.appendChild(button);
    return this.container;
  }

  onRemove() {
    this.container?.parentNode?.removeChild(this.container);
  }
}

// Real MapLibre GL JS map — replaces the old percentage-projected SVG
// MapPanel. Follows the Road-Defect reference architecture: one map
// instance owned by this component, created/torn down through effects.
// Three independent layers, back to front: the real BEST route/stop network
// (GeoJSON line + circle layers, read-only reference data) underneath the
// Fleet Drishti AI-observation markers (DOM Markers, clickable, filterable
// by kind) — DOM markers always composite above the canvas regardless of
// layer add order, so the network never obscures an event pin.
export function GISMap({
  markers,
  stops = [],
  routeLines = [],
  title = "Mumbai Urban GIS Grid",
  variant = "panel",
}: GISMapProps) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const stopsRef = useRef<TransitStop[]>(stops);
  stopsRef.current = stops;
  const routeLinesRef = useRef<NetworkRouteLine[]>(routeLines);
  routeLinesRef.current = routeLines;
  // The one route (if any) a viewer has clicked on — kept in a ref since
  // only the MapLibre event handlers below (which close over it) read it.
  // Persists the highlighted route even after the pointer leaves it or the
  // view zooms back out, independent of the zoom-based fade applied to the
  // background network layer.
  const selectedRouteIdRef = useRef<string | null>(null);

  const presentSet = useMemo(() => new Set(markers.map((m) => m.kind)), [markers]);
  const kindsPresent = KIND_ORDER.filter((kind) => presentSet.has(kind));
  const [hiddenKinds, setHiddenKinds] = useState<Set<MarkerKind>>(new Set());
  const visibleMarkers = useMemo(
    () => markers.filter((marker) => !hiddenKinds.has(marker.kind)),
    [markers, hiddenKinds],
  );

  // Network-layer visibility — separate from the marker-kind filter above,
  // since these toggle MapLibre layers (routes/stops) rather than filter
  // the DOM-marker array.
  const [showNetworkRoutes, setShowNetworkRoutes] = useState(true);
  const [showNetworkStops, setShowNetworkStops] = useState(true);

  function toggleKind(kind: MarkerKind) {
    setHiddenKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  // Map instance lifecycle — created once on mount, torn down on unmount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center: MUMBAI_METROPOLITAN_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    map.addControl(
      new RecenterControl(() => map.flyTo({ center: MUMBAI_METROPOLITAN_CENTER, zoom: DEFAULT_ZOOM })),
      "top-left",
    );
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    mapRef.current = map;
    const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: "280px", offset: 8 });
    let clickPopup: maplibregl.Popup | null = null;

    // Real BEST route network. All ~885 route-direction lines are always
    // present in the layer (this feed has no shapes.txt; see
    // NetworkRouteLine's doc comment) — but a hard minzoom would make the
    // whole network disappear below some threshold, so instead line-opacity
    // and line-width ramp continuously with zoom (MapLibre zoom
    // expressions): barely-there at DEFAULT_ZOOM's city-wide view (still a
    // real signal, never fully invisible, and never dense/spaghetti at that
    // faintness), strengthening smoothly into a clear, distinct network as
    // the viewer zooms in. A clicked/selected route's highlight (below)
    // additionally persists at full strength at any zoom. Since DOM Markers
    // always composite above the canvas, everything here sits under the
    // Fleet Drishti markers regardless of add order.
    function addNetworkRoutesLayer() {
      map.addSource(NETWORK_ROUTES_SOURCE_ID, {
        type: "geojson",
        data: routeLinesToGeoJSON(routeLinesRef.current),
      });
      map.addLayer({
        id: NETWORK_ROUTES_LAYER_ID,
        type: "line",
        source: NETWORK_ROUTES_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        // Restrained magenta/pink at every zoom — only opacity/width change
        // with zoom, never the color, so this always reads as the same
        // "BEST Network" layer at any zoom level.
        paint: {
          "line-color": "#C0266D",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            NETWORK_ROUTES_ZOOM_STOPS.faint, 0.4,
            NETWORK_ROUTES_ZOOM_STOPS.cityView, 0.7,
            NETWORK_ROUTES_ZOOM_STOPS.midZoom, 1.0,
            NETWORK_ROUTES_ZOOM_STOPS.closeZoom, 1.4,
            NETWORK_ROUTES_ZOOM_STOPS.fullDetail, 2.0,
          ],
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            NETWORK_ROUTES_ZOOM_STOPS.faint, 0.04,
            NETWORK_ROUTES_ZOOM_STOPS.cityView, 0.1,
            NETWORK_ROUTES_ZOOM_STOPS.midZoom, 0.3,
            NETWORK_ROUTES_ZOOM_STOPS.closeZoom, 0.55,
            NETWORK_ROUTES_ZOOM_STOPS.fullDetail, 0.75,
          ],
        },
      });
      map.addLayer({
        id: NETWORK_ROUTES_HIGHLIGHT_LAYER_ID,
        type: "line",
        source: NETWORK_ROUTES_SOURCE_ID,
        // No minzoom: a selected/hovered route is always exactly one line,
        // never spaghetti, so it may stay visible even zoomed all the way out.
        filter: ["==", ["get", "gtfsRouteId"], NO_ROUTE_SELECTED],
        layout: { "line-cap": "round", "line-join": "round" },
        // Clearly a distinct "selected" state — deeper/more saturated than
        // the muted background network, and noticeably thicker.
        paint: { "line-color": "#8C1854", "line-width": 4.5, "line-opacity": 0.95 },
      });

      map.on("mouseenter", NETWORK_ROUTES_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mousemove", NETWORK_ROUTES_LAYER_ID, (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        const routeId = feature?.properties?.gtfsRouteId;
        if (!routeId) return;
        map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, ["==", ["get", "gtfsRouteId"], routeId]);
        hoverPopup
          .setLngLat(e.lngLat)
          .setHTML(`<p class="font-sans text-body-sm font-semibold text-ink-primary">BEST Route ${feature!.properties!.shortName}</p>`)
          .addTo(map);
      });
      map.on("mouseleave", NETWORK_ROUTES_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
        hoverPopup.remove();
        // Revert to the persisted selection (if any) rather than always
        // clearing — so a clicked route's highlight survives the pointer
        // moving away from it.
        const restoreId = selectedRouteIdRef.current ?? NO_ROUTE_SELECTED;
        map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, ["==", ["get", "gtfsRouteId"], restoreId]);
      });
      map.on("click", NETWORK_ROUTES_LAYER_ID, (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        const props = feature?.properties;
        if (!props) return;
        selectedRouteIdRef.current = props.gtfsRouteId;
        map.setFilter(NETWORK_ROUTES_HIGHLIGHT_LAYER_ID, ["==", ["get", "gtfsRouteId"], props.gtfsRouteId]);
        clickPopup?.remove();
        clickPopup = new maplibregl.Popup({ maxWidth: "280px" })
          .setLngLat(e.lngLat)
          .setHTML(routePopupHtml({ shortName: props.shortName, longName: props.longName, distanceKm: props.distanceKm }))
          .addTo(map);
      });
    }
    if (map.isStyleLoaded()) addNetworkRoutesLayer();
    else map.once("load", addNetworkRoutesLayer);

    // Real BEST stop network — a read-only reference layer, deliberately
    // separate from the AI-observation markers below and from the (DOM
    // Marker-based) bus/issue layer, since 4,800+ stops render far more
    // efficiently as one GPU-rendered GeoJSON circle layer than as
    // individual DOM markers. Gated by NETWORK_STOPS_MIN_ZOOM so stops stay
    // hidden at the city-wide default view and only appear once the viewer
    // has zoomed in close enough (~1-2km) for individual stops to be useful
    // — unlike the route-lines layer, stops have no useful "faint" city-wide
    // rendering (individually they carry no shape/direction information), so
    // a minzoom cutoff is the right tool here, not a zoom-ramped paint value.
    function addNetworkStopsLayer() {
      map.addSource(NETWORK_STOPS_SOURCE_ID, {
        type: "geojson",
        data: stopsToGeoJSON(stopsRef.current),
      });
      map.addLayer({
        id: NETWORK_STOPS_LAYER_ID,
        type: "circle",
        source: NETWORK_STOPS_SOURCE_ID,
        minzoom: NETWORK_STOPS_MIN_ZOOM,
        // Small, clean transit dots — white fill with a thin magenta stroke
        // keeps them legible and visually tied to the BEST network lines
        // without reading as another saturated event-marker layer.
        paint: {
          "circle-radius": 2.5,
          "circle-color": "#ffffff",
          "circle-stroke-width": 1.25,
          "circle-stroke-color": "#C0266D",
          "circle-opacity": 0.9,
        },
      });
    }
    if (map.isStyleLoaded()) addNetworkStopsLayer();
    else map.once("load", addNetworkStopsLayer);

    // maplibre-gl.css forces `.maplibregl-map { position: relative }` on the
    // container, which silently defeats the `absolute inset-0` stretch this
    // div's Tailwind classes ask for — the container can end up with a
    // computed height of 0 depending on the surrounding flex/grid layout
    // (harmless in a grid-stretched context, but collapses in a plain block
    // wrapper). Sizing the container from the wrapper's actual box —
    // instead of trusting CSS percentage inheritance through a class
    // MapLibre itself overrides — keeps the map correctly sized everywhere
    // it's embedded.
    const wrapper = wrapperRef.current;
    let resizeObserver: ResizeObserver | undefined;
    if (wrapper) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        // Guards against a resize notification that was already queued by
        // the browser when this component started unmounting (e.g. an SPA
        // navigation) — disconnect() below can't cancel one already in flight.
        if (!entry || !containerRef.current) return;
        const { width, height } = entry.contentRect;
        containerRef.current.style.width = `${width}px`;
        containerRef.current.style.height = `${height}px`;
        map.resize();
      });
      resizeObserver.observe(wrapper);
    }

    return () => {
      resizeObserver?.disconnect();
      hoverPopup.remove();
      clickPopup?.remove();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Network-layer visibility toggles — separate effect since the layers may
  // not exist yet the first time this runs (style still loading).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const visibility = showNetworkRoutes ? "visible" : "none";
    for (const id of [NETWORK_ROUTES_LAYER_ID, NETWORK_ROUTES_HIGHLIGHT_LAYER_ID]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
    }
  }, [showNetworkRoutes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer(NETWORK_STOPS_LAYER_ID)) {
      map.setLayoutProperty(NETWORK_STOPS_LAYER_ID, "visibility", showNetworkStops ? "visible" : "none");
    }
  }, [showNetworkStops]);

  // Keep the network-stops source in sync if the `stops` prop changes
  // (e.g. real data arriving after an initial empty fetch, or a future page
  // passing a filtered subset). Checks the SOURCE's existence rather than
  // `map.isStyleLoaded()`: that flag can flip back to false long after the
  // map's one-time "load" event already fired (e.g. while background tiles
  // are still loading), and `map.once("load", ...)` registered after that
  // one-time event has already happened never calls back — silently
  // dropping every update that arrives after the first one.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // If the source doesn't exist yet, this is the very first mount, before
    // the one-time setup effect has run — that effect reads stopsRef.current
    // (kept in sync every render) once it does run, so there's nothing to
    // do here in that case.
    const source = map.getSource(NETWORK_STOPS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(stopsToGeoJSON(stops));
  }, [stops]);

  // Same pattern for the route-lines source.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(NETWORK_ROUTES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(routeLinesToGeoJSON(routeLines));
  }, [routeLines]);

  // Data-driven markers — diffed by id against the previous marker set on
  // every change, mirroring the Road-Defect reference's marker sync but
  // without a per-marker React root, since Fleet Drishti markers carry no
  // internal interactive state of their own.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(visibleMarkers.map((m) => m.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    visibleMarkers.forEach((marker) => {
      const existing = markersRef.current.get(marker.id);
      if (existing) {
        existing.setLngLat([marker.longitude, marker.latitude]);
        return;
      }

      const style = MARKER_STYLE[marker.kind];
      const bg = marker.intensity ? INTENSITY_BG[marker.intensity] : style.bg;
      const el = document.createElement("div");
      el.className = cn(
        "flex items-center justify-center h-6 w-6 rounded-full border-2 border-white shadow-sm",
        bg,
        marker.href ? "cursor-pointer" : "cursor-default",
      );
      // Buses are Fleet Drishti's own simulated sensing fleet, never real
      // live BEST vehicle-GPS — say so on the marker itself, not just in code.
      el.title = marker.kind === "bus-probe" ? `${marker.label} · Simulated position` : marker.label;

      const iconEl = document.createElement("span");
      iconEl.className = "material-symbols-outlined text-white";
      iconEl.style.fontSize = "13px";
      iconEl.style.lineHeight = "1";
      iconEl.textContent = style.icon;
      el.appendChild(iconEl);

      if (marker.href) {
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          navigateRef.current(marker.href!);
        });
      }

      const maplibreMarker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);

      markersRef.current.set(marker.id, maplibreMarker);
    });
  }, [visibleMarkers]);

  // CommandCenter's "panel" map tile needs its 7 layer chips to fit one
  // clean row at normal desktop width, so that variant gets a slightly
  // tighter padding/gap treatment. Live Map's "floating" overlay is
  // unaffected — same chips, same sizing as before.
  const isCompactLegend = variant === "panel";
  const chipClass = (active: boolean) =>
    cn(
      "rounded font-semibold border flex items-center transition-colors",
      isCompactLegend ? "px-1.5 py-0.5 text-body-sm gap-1" : "px-2 py-1 text-body-sm gap-1.5",
      active
        ? "bg-surface-panel border-border-slate text-ink-primary"
        : "bg-transparent border-border-slate text-ink-muted",
    );

  const legendControls = (
    <div className={cn("flex flex-wrap items-center", isCompactLegend ? "gap-0.5" : "gap-1")}>
      {routeLines.length > 0 && (
        <button
          type="button"
          onClick={() => setShowNetworkRoutes((v) => !v)}
          aria-pressed={showNetworkRoutes}
          className={chipClass(showNetworkRoutes)}
        >
          <span
            className="inline-block w-2.5 h-[2px] rounded-full"
            style={{ backgroundColor: showNetworkRoutes ? NETWORK_ROUTES_SWATCH_COLOR : "#cbd5e1" }}
          />
          BEST Network
        </button>
      )}
      {stops.length > 0 && (
        <button
          type="button"
          onClick={() => setShowNetworkStops((v) => !v)}
          aria-pressed={showNetworkStops}
          className={chipClass(showNetworkStops)}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: showNetworkStops ? NETWORK_STOPS_SWATCH_COLOR : "#cbd5e1" }}
          />
          BEST Stops
        </button>
      )}
      {(routeLines.length > 0 || stops.length > 0) && kindsPresent.length > 0 && (
        <span className={cn("w-px bg-border-slate", isCompactLegend ? "h-3 mx-px" : "h-4 mx-0.5")} aria-hidden="true" />
      )}
      {kindsPresent.map((kind) => {
        const style = MARKER_STYLE[kind];
        const active = !hiddenKinds.has(kind);
        return (
          <button key={kind} type="button" onClick={() => toggleKind(kind)} aria-pressed={active} className={chipClass(active)}>
            <span className={cn("w-2 h-2 rounded-full", active ? style.bg : "bg-border-grid")} />
            {style.label}
          </button>
        );
      })}
    </div>
  );

  if (variant === "floating") {
    // Full-bleed workspace: no outer card, map fills its container
    // edge-to-edge. Title + toggles become one compact floating control
    // strip over the map instead of a header row above it.
    return (
      <div className="relative w-full h-full">
        <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-1.5rem)] flex flex-wrap items-center gap-2 rounded-md border border-border-slate bg-surface-card/95 backdrop-blur-sm px-2.5 py-1.5 shadow-md">
          <span className="text-sm font-bold text-ink-primary tracking-tight whitespace-nowrap">{title}</span>
          <span className="w-px h-4 bg-border-slate" aria-hidden="true" />
          {legendControls}
        </div>
        <div ref={wrapperRef} className="relative w-full h-full">
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm flex flex-col relative overflow-hidden shadow-sm h-full">
      <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-sm border-b border-border-slate">
        <span className="font-title-sm text-title-sm text-ink-primary font-bold">{title}</span>
        {legendControls}
      </div>

      <div ref={wrapperRef} className="relative w-full flex-1 min-h-[320px] rounded mt-space-sm overflow-hidden border border-border-slate">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
