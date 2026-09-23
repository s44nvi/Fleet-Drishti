import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bus, Gauge, MapPin, TrafficCone, TrendingUp } from "lucide-react";
import { KpiStrip } from "../../components/telemetry";
import { PageHeader, Panel, SourceBadge } from "../../components/ui";
import { GISMap, type MapCallout } from "../../components/gis";
import {
  CongestionHotspots,
  CongestionLegend,
  HeatGrid,
  RouteAnalysis,
  TrafficHeatmapPanel,
  TrafficObservations,
  type RouteRow,
  type TrafficObservation,
} from "../../components/traffic";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, mediaService, routeService, trafficService } from "../../services";
import { CONGESTION_DISPLAY_LABEL } from "../../lib/congestion";
import { CONGESTED_THRESHOLD, DAY_LABELS, congestionColor, congestionWord, hourLabel, mondayIndex } from "../../lib/congestionIndex";
import { buildRoadField, congestionGlow, congestionRoads, estimateRoute, type CorridorPoint } from "../../lib/trafficModel";
import { busMarker } from "../../lib/mapMarkers";
import { datasetAnchor } from "../../lib/pulse";
import { categoryVisual, TONE_CLASSES } from "../../lib/visuals";
import { cn } from "../../lib/cn";
import type { CongestionLevel, KpiTile, MapMarker, Severity } from "../../types";

const LEVEL_SEVERITY: Record<CongestionLevel, Severity> = { low: "low", medium: "medium", high: "high", severe: "critical" };

// Compact tab labels for the long highway names.
function shortCorridor(name: string) {
  return name.replace("Western Express Highway", "WEH").replace("Eastern Express Highway", "EEH");
}

function signedPct(value: number) {
  const n = Math.round(value);
  return `${n > 0 ? "+" : ""}${n}%`;
}

// Traffic Intelligence — LOCATION × DAY × TIME → CONGESTION.
// Map: real OpenStreetMap roads around each monitored corridor, coloured by
// the congestion index for the chosen day/hour (green → red), with bus
// markers and callouts on the busiest corridors. Right: time/day analysis
// and the hotspot ranking. Below: weekly patterns, route estimates and the
// latest fleet observations.
// Data: the day × hour pattern and everything derived from it is DEMO; the
// corridor readings, buses and observations are fixture data (SIMULATED).
// All of it flows through trafficService, so real bus-derived observations
// can replace it without changing this page.
export function Traffic() {
  const { data: patterns } = useAsyncData(() => trafficService.listCorridorPatterns(), []);
  const { data: readings } = useAsyncData(() => trafficService.listCorridorReadings(), []);
  const { data: roads } = useAsyncData(() => trafficService.listCorridorRoads(), []);
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

  const allPatterns = useMemo(() => patterns ?? [], [patterns]);
  const corridors = useMemo<CorridorPoint[]>(
    () => allPatterns.map((p) => ({ hotspotId: p.hotspotId, corridor: p.corridor, latitude: p.latitude, longitude: p.longitude })),
    [allPatterns],
  );
  const grids = useMemo(() => allPatterns.map((p) => p.grid), [allPatterns]);
  const field = useMemo(() => (roads && corridors.length ? buildRoadField(roads, corridors) : null), [roads, corridors]);

  const values = useMemo(() => grids.map((g) => g[day][hour]), [grids, day, hour]);
  const prevValues = useMemo(() => grids.map((g) => g[day][(hour + 23) % 24]), [grids, day, hour]);
  const usualValues = useMemo(() => grids.map((g) => g.reduce((s, row) => s + row[hour], 0) / 7), [grids, hour]);

  const focusId = selectedId ?? readings?.[0]?.hotspotId ?? null;
  const focusIndex = corridors.findIndex((c) => c.hotspotId === focusId);

  const segments = useMemo(() => (field ? congestionRoads(field, values, focusIndex) : []), [field, values, focusIndex]);
  const glow = useMemo(() => (field ? congestionGlow(field, values) : []), [field, values]);

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const byHour = useMemo(() => Array.from({ length: 24 }, (_, h) => mean(grids.map((g) => g[day][h]))), [grids, day]);
  const byDay = useMemo(() => Array.from({ length: 7 }, (_, d) => mean(grids.map((g) => g[d][hour]))), [grids, hour]);

  const cityIndex = mean(values);
  const prevCityIndex = mean(prevValues);
  const congested = values.filter((v) => v >= CONGESTED_THRESHOLD).length;
  const prevCongested = prevValues.filter((v) => v >= CONGESTED_THRESHOLD).length;
  const allReadings = useMemo(() => readings ?? [], [readings]);
  const avgSpeed = allReadings.length ? mean(allReadings.map((r) => r.averageSpeedKph)) : 0;
  const activeBuses = (buses ?? []).filter((b) => b.status === "active").length;
  const when = `${DAY_LABELS[day]} ${hourLabel(hour)}`;

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
      label: "Congested corridors · demo",
      value: String(congested),
      unit: `of ${values.length}`,
      sub: `${congested - prevCongested >= 0 ? "+" : ""}${congested - prevCongested} vs previous hour`,
      subTone: congested > prevCongested ? "alert" : undefined,
      icon: TrafficCone,
      tone: congested > 0 ? "alert" : "ok",
    },
    {
      id: "speed",
      label: "Avg. bus speed · simulated",
      value: avgSpeed.toFixed(0),
      unit: "km/h",
      sub: `Across ${allReadings.length} corridors · latest reading`,
      icon: TrendingUp,
      tone: avgSpeed < 15 ? "alert" : avgSpeed < 25 ? "watch" : "ok",
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

  // Map: corridor markers coloured by the current index + the bus fleet.
  const markers = useMemo<MapMarker[]>(() => {
    const corridorMarkers: MapMarker[] = allPatterns.map((p, i) => {
      const word = congestionWord(values[i] ?? 0);
      return {
        id: p.hotspotId,
        kind: "traffic-chokepoint",
        category: "congestion",
        label: `${p.corridor} · ${p.location}`,
        detail: `${word.label} · index ${Math.round((values[i] ?? 0) * 100)} · demo`,
        latitude: p.latitude,
        longitude: p.longitude,
        tone: word.tone,
      };
    });
    return [...(buses ?? []).map(busMarker), ...corridorMarkers];
  }, [allPatterns, values, buses]);

  // Callouts on the two most congested corridors (plus the selected one).
  const callouts = useMemo<MapCallout[]>(() => {
    const ranked = allPatterns.map((p, i) => ({ p, i })).sort((a, b) => values[b.i] - values[a.i]);
    const chosen = ranked.slice(0, 2);
    const selected = ranked.find((r) => r.p.hotspotId === selectedId);
    if (selected && !chosen.includes(selected)) chosen[1] = selected;
    const midLng = mean(allPatterns.map((p) => p.longitude));
    return chosen.map(({ p, i }) => ({
      key: p.hotspotId,
      latitude: p.latitude,
      longitude: p.longitude,
      side: p.longitude > midLng ? "left" : "right",
      content: (
        <CorridorCallout
          corridor={p.corridor}
          location={p.location}
          value={values[i]}
          vsUsual={usualValues[i] > 0 ? ((values[i] - usualValues[i]) / usualValues[i]) * 100 : 0}
          selected={p.hotspotId === focusId}
        />
      ),
    }));
  }, [allPatterns, values, usualValues, selectedId, focusId]);

  const gridPattern = allPatterns.find((p) => p.hotspotId === (patternId ?? focusId)) ?? allPatterns[0];

  const routeRows = useMemo<RouteRow[]>(
    () =>
      (routes ?? []).map((r) => {
        const short = r.routeId.replace("BEST-", "");
        const line = networkRouteLines?.find((l) => l.shortName === short);
        return {
          routeId: r.routeId,
          name: r.name,
          from: r.origin.replace(/ Bus Station| Depot/g, ""),
          to: r.destination.replace(/ Bus Station| Depot/g, ""),
          distanceKm: r.distanceKm,
          estimate: estimateRoute(line, r.distanceKm, corridors, grids, day, hour),
        };
      }),
    [routes, networkRouteLines, corridors, grids, day, hour],
  );

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

  function selectCorridor(id: string | null) {
    if (id && !allPatterns.some((p) => p.hotspotId === id)) return; // bus markers: tooltip only
    setSelectedId(id);
    if (id) setPatternId(id);
  }

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
            <span>Congestion by location, day and hour</span>
            <SourceBadge source="demo" />
          </>
        }
      />

      <KpiStrip tiles={kpis} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:h-[740px]">
        <GISMap
          className="xl:col-span-8 h-[520px] sm:h-[600px] xl:h-full"
          ariaLabel={`Traffic congestion map, ${when}`}
          markers={markers}
          routeLines={networkRouteLines ?? []}
          initialShowRoutes={false}
          heatmap={{ points: glow, label: "Traffic heatmap (demo)", ramp: "congestion" }}
          congestionSegments={segments}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={selectCorridor}
          fitToMarkers
          callouts={callouts}
          legend={
            <div className="flex flex-col gap-1.5">
              <CongestionLegend compact />
              <p className="text-micro text-ink-3">Roads © OpenStreetMap · congestion demo</p>
            </div>
          }
          overlay={
            <div className="absolute bottom-9 left-3 z-10 flex items-center gap-2 rounded-lg bg-surface/95 px-3 py-2 shadow-float">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: congestionColor(cityIndex) }} aria-hidden="true" />
              <span className="text-item text-ink tabular-nums">{when}</span>
              <span className={cn("text-micro", TONE_CLASSES[congestionWord(cityIndex).tone].ink)}>{congestionWord(cityIndex).label}</span>
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
            className="flex-1 min-h-[240px]"
            readings={allReadings}
            selectedId={focusId}
            onSelect={selectCorridor}
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
            {allPatterns.map((p) => {
              const active = p.hotspotId === gridPattern?.hotspotId;
              return (
                <button
                  key={p.hotspotId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPatternId(p.hotspotId)}
                  title={p.corridor}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-meta transition-colors duration-150",
                    active ? "bg-surface text-action font-semibold shadow-panel ring-1 ring-action/30" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {shortCorridor(p.corridor)}
                </button>
              );
            })}
          </div>
          {gridPattern && (
            <HeatGrid
              grid={gridPattern.grid}
              day={day}
              hour={hour}
              onSelect={(d, h) => {
                setPlaying(false);
                setDay(d);
                setHour(h);
              }}
              label={`Congestion by day and hour on ${gridPattern.corridor}`}
            />
          )}
        </Panel>

        <RouteAnalysis className="2xl:col-span-4" rows={routeRows} hour={hour} />
        <TrafficObservations className="2xl:col-span-3" items={observations} anchor={anchor} />
      </section>
    </>
  );
}

function CorridorCallout({
  corridor,
  location,
  value,
  vsUsual,
  selected,
}: {
  corridor: string;
  location: string;
  value: number;
  vsUsual: number;
  selected: boolean;
}) {
  const word = congestionWord(value);
  return (
    <div className={cn("w-[228px] rounded-xl bg-surface px-3 py-2.5 shadow-float", selected && "ring-2 ring-action/50")}>
      <div className="flex items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: congestionColor(value) }}
          aria-hidden="true"
        >
          <TrafficCone size={15} strokeWidth={2} />
        </span>
        <span className="min-w-0">
          <span className="block text-item text-ink leading-tight">{corridor}</span>
          <span className="block text-meta text-ink-3 truncate">{location}</span>
        </span>
      </div>
      <p className={cn("mt-1.5 text-micro", TONE_CLASSES[word.tone].ink)}>
        {word.label} congestion · index {Math.round(value * 100)}
      </p>
      <p className="text-meta text-ink-3 tabular-nums">
        <span className={vsUsual > 0 ? "text-alert-ink font-semibold" : "text-ok-ink font-semibold"}>{signedPct(vsUsual)}</span> vs usual ·
        demo
      </p>
    </div>
  );
}
