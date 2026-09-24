import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bus, Gauge, MapPin, TrafficCone, TrendingUp } from "lucide-react";
import { KpiStrip } from "../../components/telemetry";
import { PageHeader, Panel, SourceBadge } from "../../components/ui";
import { GISMap, type MapCallout, type RasterOverlay } from "../../components/gis";
import {
  CongestionHotspots,
  CongestionLegend,
  HeatGrid,
  RouteAnalysis,
  TrafficHeatmapPanel,
  TrafficObservations,
  type HotspotItem,
  type RouteRow,
  type TrafficObservation,
} from "../../components/traffic";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, mediaService, routeService, trafficService } from "../../services";
import { CONGESTION_DISPLAY_LABEL } from "../../lib/congestion";
import { CONGESTED_THRESHOLD, DAY_LABELS, congestionColor, congestionWord, hourLabel, mondayIndex } from "../../lib/congestionIndex";
import {
  RASTER_COORDINATES,
  buildTrafficField,
  congestionRoads,
  estimateRoute,
  renderHeatRaster,
  roadWeights,
  type CorridorPoint,
} from "../../lib/trafficModel";
import {
  TRAFFIC_SEGMENTS,
  corridorGrid,
  directionLabel,
  networkIndex,
  segmentStretch,
} from "../../lib/trafficProfiles";
import { TRAFFIC_CORRIDORS } from "../../data/traffic/corridors";
import { busMarker } from "../../lib/mapMarkers";
import { datasetAnchor } from "../../lib/pulse";
import { categoryVisual, TONE_CLASSES } from "../../lib/visuals";
import { cn } from "../../lib/cn";
import type { CongestionLevel, KpiTile, MapMarker, Severity } from "../../types";

const LEVEL_SEVERITY: Record<CongestionLevel, Severity> = { low: "low", medium: "medium", high: "high", severe: "critical" };
const HOTSPOT_COUNT = 6;
// Two callouts closer than this (degrees of latitude) would overlap.
const CALLOUT_MIN_LAT_GAP = 0.06;
// Whole of Greater Mumbai, Colaba to Dahisar.
const CITY_VIEW = { latitude: 19.085, longitude: 72.88, zoom: 10.6, key: "mumbai" };

// Compact labels for the long highway names.
function shortCorridor(name: string) {
  return name.replace("Western Express Highway", "WEH").replace("Eastern Express Highway", "EEH");
}

function signedPct(value: number) {
  const n = Math.round(value);
  return `${n > 0 ? "+" : ""}${n}%`;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// Traffic Intelligence — WHERE is traffic building up across Mumbai at this
// DAY + TIME?
// Map: a soft city-wide heat layer over real OpenStreetMap roads, coloured by
// the congestion of each corridor stretch (per direction of travel) and of
// the busy areas around them, with bus markers and a few callouts on top.
// Right: the time/day analysis and the hotspot ranking for the chosen slot.
// Below: weekly patterns, route estimates and the latest fleet observations.
// Data: the traffic profiles are a deterministic DEMO model patterned on
// recurring Mumbai congestion; buses and observations are fixture data
// (SIMULATED). All of it flows through trafficService, so bus-derived
// observations (camera/sensor + GPS + timestamp → per-segment aggregation)
// can replace the model without changing this page.
export function Traffic() {
  const { data: profiles } = useAsyncData(() => trafficService.listTrafficProfiles(), []);
  const { data: readings } = useAsyncData(() => trafficService.listCorridorReadings(), []);
  const { data: roads } = useAsyncData(() => trafficService.listMumbaiRoads(), []);
  const { data: buses } = useAsyncData(() => fleetService.listBuses(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const { data: clips } = useAsyncData(() => mediaService.listDetectionClips(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);

  const anchor = useMemo(() => datasetAnchor((readings ?? []).map((h) => h.observedAt)), [readings]);
  const [day, setDay] = useState(() => mondayIndex(anchor));
  const [hour, setHour] = useState(() => new Date(anchor).getHours());
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [patternId, setPatternId] = useState<string | null>(null);

  // Open on the weekday/hour of the latest fleet reading, once it loads.
  const initialisedRef = useRef(false);
  useEffect(() => {
    if (initialisedRef.current || !readings?.length) return;
    initialisedRef.current = true;
    setDay(mondayIndex(anchor));
    setHour(new Date(anchor).getHours());
  }, [readings, anchor]);

  const field = useMemo(() => (roads ? buildTrafficField(roads) : null), [roads]);
  const snap = profiles?.[day]?.[hour] ?? null;
  const weights = useMemo(() => (field && snap ? roadWeights(field, snap) : null), [field, snap]);

  const rasterOverlay = useMemo<RasterOverlay | null>(() => {
    if (!field || !weights) return null;
    return { url: renderHeatRaster(field, weights), coordinates: RASTER_COORDINATES, label: "Traffic heatmap (demo)", opacity: 0.88 };
  }, [field, weights]);
  const lines = useMemo(() => (field && weights ? congestionRoads(field, weights, selectedId) : []), [field, weights, selectedId]);

  // Only stretches that exist on the map take part in rankings and counts.
  const segments = useMemo(
    () => (field ? TRAFFIC_SEGMENTS.filter((s) => field.mappedSegments.has(s.id)) : []),
    [field],
  );

  const cityIndex = snap ? networkIndex(snap) : 0;
  const prevSnap = profiles?.[day]?.[(hour + 23) % 24] ?? null;
  const prevCityIndex = prevSnap ? networkIndex(prevSnap) : 0;
  const byHour = useMemo(() => (profiles ? profiles[day].map(networkIndex) : []), [profiles, day]);
  const byDay = useMemo(() => (profiles ? profiles.map((d) => networkIndex(d[hour])) : []), [profiles, hour]);

  const when = `${DAY_LABELS[day]} ${hourLabel(hour)}`;

  // The worst stretch per corridor at this slot, ranked.
  const hotspots = useMemo<HotspotItem[]>(() => {
    if (!profiles || !snap) return [];
    const best = new Map<string, HotspotItem>();
    for (const seg of segments) {
      const t = snap.segments[seg.id];
      const usual = mean(profiles.map((d) => d[hour].segments[seg.id][t.direction]));
      const value = t[t.direction];
      const item: HotspotItem = {
        id: seg.id,
        corridor: seg.corridor,
        stretch: segmentStretch(seg, t.direction),
        direction: directionLabel(seg, t.direction),
        level: t.level,
        index: t.intensity,
        speedKph: t.speedKph,
        vsUsualPct: usual > 0 ? ((value - usual) / usual) * 100 : 0,
      };
      const current = best.get(seg.corridorId);
      if (!current || item.index > current.index) best.set(seg.corridorId, item);
    }
    return [...best.values()].sort((a, b) => b.index - a.index).slice(0, HOTSPOT_COUNT);
  }, [profiles, snap, segments, hour]);

  const segmentValues = useMemo(() => (snap ? segments.map((s) => snap.segments[s.id].intensity) : []), [snap, segments]);
  const prevSegmentValues = useMemo(() => (prevSnap ? segments.map((s) => prevSnap.segments[s.id].intensity) : []), [prevSnap, segments]);
  const congested = segmentValues.filter((v) => v >= CONGESTED_THRESHOLD).length;
  const prevCongested = prevSegmentValues.filter((v) => v >= CONGESTED_THRESHOLD).length;
  const avgSpeed = snap && segments.length ? mean(segments.map((s) => snap.segments[s.id].speedKph)) : 0;
  const prevAvgSpeed = prevSnap && segments.length ? mean(segments.map((s) => prevSnap.segments[s.id].speedKph)) : 0;
  const activeBuses = (buses ?? []).filter((b) => b.status === "active").length;

  const indexDelta = prevCityIndex > 0 ? ((cityIndex - prevCityIndex) / prevCityIndex) * 100 : 0;
  const kpis: KpiTile[] = [
    {
      id: "index",
      label: "Traffic index · demo",
      value: String(Math.round(cityIndex * 100)),
      unit: "/ 100",
      sub: `${signedPct(indexDelta)} vs previous hour`,
      subTone: indexDelta > 0 ? "alert" : "ok",
      icon: Gauge,
      tone: congestionWord(cityIndex).tone,
    },
    {
      id: "congested",
      label: "Congested stretches · demo",
      value: String(congested),
      unit: `of ${segments.length}`,
      sub: `${congested - prevCongested >= 0 ? "+" : ""}${congested - prevCongested} vs previous hour`,
      subTone: congested > prevCongested ? "alert" : undefined,
      icon: TrafficCone,
      tone: congested > segments.length / 3 ? "alert" : congested > 0 ? "watch" : "ok",
    },
    {
      id: "speed",
      label: "Avg. corridor speed · demo",
      value: avgSpeed.toFixed(0),
      unit: "km/h",
      sub: `${signedPct(prevAvgSpeed > 0 ? ((avgSpeed - prevAvgSpeed) / prevAvgSpeed) * 100 : 0)} vs previous hour`,
      subTone: avgSpeed < prevAvgSpeed ? "alert" : "ok",
      icon: TrendingUp,
      tone: avgSpeed < 20 ? "alert" : avgSpeed < 30 ? "watch" : "ok",
    },
    {
      id: "buses",
      label: "Active buses · simulated",
      value: String(activeBuses),
      unit: `of ${buses?.length ?? 0}`,
      sub: "On route with sensing",
      icon: Bus,
      tone: "ok",
    },
  ];

  const segmentById = useMemo(() => new Map(TRAFFIC_SEGMENTS.map((s) => [s.id, s])), []);

  // Map: the bus fleet plus a small marker on each ranked hotspot.
  const markers = useMemo<MapMarker[]>(() => {
    const hotspotMarkers: MapMarker[] = hotspots.slice(0, 5).map((h) => {
      const seg = segmentById.get(h.id)!;
      return {
        id: h.id,
        kind: "traffic-chokepoint",
        category: "congestion",
        label: `${h.corridor} · ${h.stretch}`,
        detail: `${h.direction} · ${congestionWord(h.index).label} · ~${h.speedKph} km/h · demo`,
        latitude: seg.mid[1],
        longitude: seg.mid[0],
        tone: congestionWord(h.index).tone,
      };
    });
    return [...(buses ?? []).map(busMarker), ...hotspotMarkers];
  }, [hotspots, buses, segmentById]);

  // Callouts on the two worst stretches that are far enough apart not to
  // overlap (the selected one replaces #2). Cards open eastwards, over the
  // harbour, clear of the layer panel on the west.
  const callouts = useMemo<MapCallout[]>(() => {
    const [first, ...rest] = hotspots;
    if (!first) return [];
    const firstMid = segmentById.get(first.id)!.mid;
    const apart = (h: HotspotItem) => Math.abs(segmentById.get(h.id)!.mid[1] - firstMid[1]) > CALLOUT_MIN_LAT_GAP;
    const chosen = [first, rest.find(apart)].filter((h): h is HotspotItem => Boolean(h));
    const selected = hotspots.find((h) => h.id === selectedId);
    if (selected && !chosen.includes(selected)) chosen[chosen.length > 1 ? 1 : chosen.length] = selected;
    return chosen.map((h) => {
      const seg = segmentById.get(h.id)!;
      return {
        key: h.id,
        latitude: seg.mid[1],
        longitude: seg.mid[0],
        side: "right",
        content: <CorridorCallout item={h} selected={h.id === selectedId} />,
      };
    });
  }, [hotspots, selectedId, segmentById]);

  const patternCorridorId =
    patternId ?? (selectedId ? segmentById.get(selectedId)?.corridorId : undefined) ?? segmentById.get(hotspots[0]?.id ?? "")?.corridorId ?? "weh";
  const patternCorridor = TRAFFIC_CORRIDORS.find((c) => c.id === patternCorridorId) ?? TRAFFIC_CORRIDORS[0];
  const patternGrid = useMemo(() => (profiles ? corridorGrid(profiles, patternCorridor.id) : null), [profiles, patternCorridor.id]);

  // Route estimates feel each mapped stretch's weekly pattern.
  const segmentPoints = useMemo<CorridorPoint[]>(
    () => segments.map((s) => ({ id: s.id, longitude: s.mid[0], latitude: s.mid[1] })),
    [segments],
  );
  const segmentGrids = useMemo(
    () =>
      profiles
        ? segments.map((s) => profiles.map((d) => d.map((snapshot) => (snapshot.segments[s.id].forward + snapshot.segments[s.id].reverse) / 2)))
        : [],
    [profiles, segments],
  );
  const routeRows = useMemo<RouteRow[]>(
    () =>
      segmentGrids.length
        ? (routes ?? []).map((r) => {
            const short = r.routeId.replace("BEST-", "");
            const line = networkRouteLines?.find((l) => l.shortName === short);
            return {
              routeId: r.routeId,
              name: r.name,
              from: r.origin.replace(/ Bus Station| Depot/g, ""),
              to: r.destination.replace(/ Bus Station| Depot/g, ""),
              distanceKm: r.distanceKm,
              estimate: estimateRoute(line, r.distanceKm, segmentPoints, segmentGrids, day, hour),
            };
          })
        : [],
    [routes, networkRouteLines, segmentPoints, segmentGrids, day, hour],
  );

  const allReadings = useMemo(() => readings ?? [], [readings]);
  const observations = useMemo<TrafficObservation[]>(() => {
    const fromEvents: TrafficObservation[] = (events ?? [])
      .filter((e) => e.eventType === "traffic")
      .map((e) => ({
        id: e.eventId,
        title: categoryVisual(e.subtype).label,
        location: e.landmark ? `${e.location} · ${e.landmark}` : e.location,
        busLabel: e.busId,
        timestamp: e.timestamp,
        severity: e.severity,
        clip: clips?.find((c) => c.eventId === e.eventId),
        href: `/fleet/${e.busId}`,
      }));
    const fromReadings: TrafficObservation[] = allReadings.map((r) => ({
      id: r.hotspotId,
      title: `${CONGESTION_DISPLAY_LABEL[r.congestionLevel]} congestion`,
      location: `${shortCorridor(r.corridor)} · ${r.location} · ${r.averageSpeedKph} km/h`,
      busLabel: `${r.observingBusCount} buses`,
      timestamp: r.observedAt,
      severity: LEVEL_SEVERITY[r.congestionLevel],
    }));
    return [...fromEvents, ...fromReadings]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [events, clips, allReadings]);

  const setHourStable = useCallback((h: number) => setHour(h), []);

  function selectSegment(id: string | null) {
    if (id && !segmentById.has(id)) return; // bus markers: tooltip only
    setSelectedId(id);
    if (id) setPatternId(segmentById.get(id)?.corridorId ?? null);
  }

  const cityWord = congestionWord(cityIndex);

  return (
    <>
      <PageHeader
        title="Traffic Intelligence"
        context={
          <>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} aria-hidden="true" />
              Mumbai
            </span>
            <span aria-hidden="true">·</span>
            <span>Where traffic builds up, by day and hour</span>
            <SourceBadge source="demo" />
          </>
        }
      />

      <KpiStrip tiles={kpis} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:h-[760px]">
        <GISMap
          className="xl:col-span-8 h-[560px] sm:h-[640px] xl:h-full"
          ariaLabel={`Mumbai traffic heatmap, ${when}`}
          markers={markers}
          routeLines={networkRouteLines ?? []}
          initialShowRoutes={false}
          rasterOverlay={rasterOverlay}
          congestionSegments={lines}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={selectSegment}
          flyToSelection={false}
          focus={CITY_VIEW}
          callouts={callouts}
          legend={
            <div className="flex flex-col gap-1.5">
              <CongestionLegend compact />
              <p className="text-micro text-ink-3">Roads © OpenStreetMap · congestion: demo model</p>
            </div>
          }
          overlay={
            <div className="absolute bottom-9 left-3 z-10 flex items-center gap-2.5 rounded-lg bg-surface/95 px-3 py-2 shadow-float">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: congestionColor(cityIndex) }} aria-hidden="true" />
              <span className="text-title text-ink tabular-nums">{when}</span>
              <span className={cn("text-micro", TONE_CLASSES[cityWord.tone].ink)}>
                {cityWord.label} · index {Math.round(cityIndex * 100)}
              </span>
              <SourceBadge source="demo" />
            </div>
          }
        />

        <div className="xl:col-span-4 flex flex-col gap-4 min-h-0">
          <TrafficHeatmapPanel
            className="shrink-0"
            day={day}
            hour={hour}
            onDayChange={setDay}
            onHourChange={setHourStable}
            playing={playing}
            onPlayingChange={setPlaying}
            byHour={byHour}
            byDay={byDay}
          />
          <CongestionHotspots
            className="flex-1 min-h-[260px]"
            items={hotspots}
            when={when}
            selectedId={selectedId}
            onSelect={(id) => selectSegment(id === selectedId ? null : id)}
            onHover={setHoveredId}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-12 gap-4">
        <Panel as="section" className="lg:col-span-2 2xl:col-span-5 p-4 flex flex-col gap-3" aria-label="Traffic patterns">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-title text-ink">Traffic patterns</h2>
              <p className="text-meta text-ink-3">Typical congestion by day and hour</p>
            </div>
            <SourceBadge source="demo" />
          </div>
          <div role="tablist" aria-label="Corridor" className="flex flex-wrap gap-1 rounded-lg bg-surface-2 p-0.5 w-fit">
            {TRAFFIC_CORRIDORS.map((c) => {
              const active = c.id === patternCorridor.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPatternId(c.id)}
                  title={c.name}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-meta transition-colors duration-150",
                    active ? "bg-surface text-action font-semibold shadow-panel ring-1 ring-action/30" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {c.short}
                </button>
              );
            })}
          </div>
          {patternGrid && (
            <HeatGrid
              grid={patternGrid}
              day={day}
              hour={hour}
              onSelect={(d, h) => {
                setPlaying(false);
                setDay(d);
                setHour(h);
              }}
              label={`Congestion by day and hour on ${patternCorridor.name}`}
            />
          )}
        </Panel>

        <RouteAnalysis className="2xl:col-span-4" rows={routeRows} hour={hour} />
        <TrafficObservations className="2xl:col-span-3" items={observations} anchor={anchor} />
      </section>
    </>
  );
}

function CorridorCallout({ item, selected }: { item: HotspotItem; selected: boolean }) {
  const word = congestionWord(item.index);
  return (
    <div className={cn("w-[220px] rounded-xl bg-surface px-3 py-2.5 shadow-float", selected && "ring-2 ring-action/50")}>
      <div className="flex items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: congestionColor(item.index) }}
          aria-hidden="true"
        >
          <TrafficCone size={15} strokeWidth={2} />
        </span>
        <span className="min-w-0">
          <span className="block text-item text-ink leading-tight truncate">{shortCorridor(item.corridor)}</span>
          <span className="block text-meta text-ink-3 truncate">{item.stretch}</span>
        </span>
      </div>
      <p className={cn("mt-1.5 text-micro", TONE_CLASSES[word.tone].ink)}>
        {word.label} · {item.direction} · ~{item.speedKph} km/h
      </p>
      <p className="text-meta text-ink-3 tabular-nums">
        <span className={item.vsUsualPct > 0 ? "text-alert-ink font-semibold" : "text-ok-ink font-semibold"}>{signedPct(item.vsUsualPct)}</span>{" "}
        vs usual for this hour · demo
      </p>
    </div>
  );
}
