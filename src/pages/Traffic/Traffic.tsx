import { PageHeader, Panel, PanelHeader } from "../../components/ui";
import { KpiStrip, DetectionDistributionChart } from "../../components/telemetry";
import { CorridorDensityCard, BottleneckList, RoutePerformancePanel, ODFlowPanel, TrafficInsightsPanel } from "../../components/traffic";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { analyticsService, issueService, routeService } from "../../services";
import { congestionToIntensity } from "../../lib/congestion";
import type { MapMarker } from "../../types";

const INTENSITY_LEGEND: { label: string; swatch: string }[] = [
  { label: "Low", swatch: "bg-transit-ochre/70" },
  { label: "Medium", swatch: "bg-transit-warning" },
  { label: "High", swatch: "bg-signal-alert/80" },
  { label: "Critical", swatch: "bg-signal-alert" },
];

// Traffic Intelligence: demonstrates the PS's full chain — Vehicle
// Detection -> Classification -> Counting -> Density -> Bottleneck
// Detection -> Congestion -> Route/Traffic Insight — reusing the existing
// TrafficHotspot fixture/service (mockTrafficHotspots via
// issueService.listTrafficHotspots) as the single source of truth for
// every density/congestion/speed value on this page, exactly as the
// Command Center's Top Hotspots and Detection Distribution already do.
// Per-vehicle classification/counting has no supporting fixture data yet
// (the fleet cameras don't currently classify vehicle type), so that slice
// is a clearly labeled prototype model — see analyticsService's
// getVehicleClassificationDemo doc comment.
export function Traffic() {
  const { data: hotspots, loading } = useAsyncData(() => issueService.listTrafficHotspots(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);
  const { data: classification } = useAsyncData(() => analyticsService.getVehicleClassificationDemo(), []);

  const allHotspots = hotspots ?? [];
  const allRoutes = routes ?? [];
  const allClassification = classification ?? [];

  // --- A: KPIs — every value real, and the same "high/severe = bottleneck"
  // threshold used by BottleneckList below, so the KPI row and the section
  // beneath it never disagree on what counts as a bottleneck ---
  const bottlenecks = allHotspots.filter((h) => h.congestionLevel === "high" || h.congestionLevel === "severe");
  const elevated = allHotspots.filter((h) => h.congestionLevel !== "low");
  const avgSpeed = allHotspots.length
    ? (allHotspots.reduce((sum, h) => sum + h.averageSpeedKph, 0) / allHotspots.length).toFixed(1)
    : "0";
  const totalFleetObservations = allHotspots.reduce((sum, h) => sum + h.observingBusCount, 0);

  const kpiTiles = [
    { id: "traffic-observations", label: "Active Traffic Observations", value: String(allHotspots.length), caption: "Monitored corridors" },
    { id: "high-density", label: "High-Density Corridors", value: String(elevated.length), caption: "Above low congestion" },
    { id: "active-bottlenecks", label: "Active Bottlenecks", value: String(bottlenecks.length), caption: "High or critical congestion" },
    { id: "avg-speed", label: "Average Observed Speed", value: avgSpeed, valueLabel: "km/h", caption: "Across monitored corridors" },
    { id: "fleet-observations", label: "Fleet Observations", value: String(totalFleetObservations), caption: "Buses reporting congestion" },
  ];

  // --- B: fleet-wide vehicle classification totals (prototype) ---
  const classificationTotals = allClassification.reduce(
    (acc, c) => ({
      cars: acc.cars + c.counts.cars,
      twoWheelers: acc.twoWheelers + c.counts.twoWheelers,
      buses: acc.buses + c.counts.buses,
      trucks: acc.trucks + c.counts.trucks,
    }),
    { cars: 0, twoWheelers: 0, buses: 0, trucks: 0 },
  );
  const classificationBuckets = [
    { bucket: "Cars", count: classificationTotals.cars },
    { bucket: "Two-wheelers", count: classificationTotals.twoWheelers },
    { bucket: "Buses", count: classificationTotals.buses },
    { bucket: "Trucks", count: classificationTotals.trucks },
  ];

  // --- D: congestion heatmap markers, reusing GISMap's traffic-chokepoint
  // layer with real coordinates and each hotspot's real congestion level ---
  const trafficMarkers: MapMarker[] = allHotspots.map((hotspot) => ({
    id: hotspot.hotspotId,
    kind: "traffic-chokepoint",
    label: `${hotspot.location} · ${hotspot.congestionLevel}`,
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    intensity: congestionToIntensity(hotspot.congestionLevel),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Traffic Intelligence"
        description="Vehicle detection, classification, density and bottleneck intelligence from the public transport fleet."
      />

      <KpiStrip tiles={kpiTiles} columns={5} />

      {/* B: Vehicle Classification & Counts, plus per-corridor Density */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-md w-full items-stretch">
        <DetectionDistributionChart
          buckets={classificationBuckets}
          title="Vehicle Classification"
          meta="Prototype · Demo Data"
          icon="directions_car"
          emptyLabel="No traffic observations to classify yet."
        />
        <TrafficInsightsPanel hotspots={allHotspots} routes={allRoutes} classification={allClassification} />
      </section>

      <Panel className="p-space-sm flex flex-col gap-space-sm">
        <PanelHeader title="Vehicle Density by Corridor" icon="speed" meta={<span className="font-label-code text-label-code text-ink-muted">{allHotspots.length} corridors</span>} />
        {loading ? (
          <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading traffic corridors…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            {allHotspots.map((hotspot) => (
              <CorridorDensityCard
                key={hotspot.hotspotId}
                hotspot={hotspot}
                classification={allClassification.find((c) => c.hotspotId === hotspot.hotspotId)?.counts}
              />
            ))}
            {allHotspots.length === 0 && (
              <span className="p-space-md font-body-sm text-body-sm text-ink-muted">No traffic corridors detected.</span>
            )}
          </div>
        )}
      </Panel>

      {/* C: Bottleneck Intelligence */}
      <BottleneckList bottlenecks={bottlenecks} />

      {/* D: Congestion heatmap */}
      <div id="traffic-map" className="flex flex-col gap-space-xs">
        <div className="h-[360px]">
          <GISMap markers={trafficMarkers} title="Congestion Heatmap" />
        </div>
        <div className="flex items-center gap-space-md px-space-xs">
          <span className="font-label-code text-label-code text-ink-muted">Congestion:</span>
          {INTENSITY_LEGEND.map((entry) => (
            <span key={entry.label} className="flex items-center gap-1.5 font-label-code text-label-code text-ink-secondary">
              <span className={`w-2.5 h-2.5 rounded-full ${entry.swatch}`} />
              {entry.label}
            </span>
          ))}
        </div>
      </div>

      {/* E: Route Performance / Delay, and Origin-Destination flow */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-md w-full items-stretch">
        <RoutePerformancePanel routes={allRoutes} />
        <ODFlowPanel routes={allRoutes} />
      </section>
    </>
  );
}
