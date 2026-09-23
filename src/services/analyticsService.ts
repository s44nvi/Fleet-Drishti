import type { CongestionLevel, KpiTile } from "../types";
import { mockBuses, mockEvents, mockDetections, mockIssues, mockTrafficHotspots } from "../data/mock";
import { DETECTION_TAXONOMY_BUCKETS, bucketForSubtype, type TaxonomyBucket } from "../lib/taxonomy";
import { mockAsync } from "./mockAsync";

export type { TaxonomyBucket };

// Every number here is derived from the mock fixtures at call time — none
// of it is a hardcoded display string. When this swaps to a real backend,
// it will aggregate over live data the same way.
//
// At most four KPIs (Command Center spec). No coverage/health figures: the
// fixtures carry nothing that would support them.
function computeCommandCenterKpis(): KpiTile[] {
  const activeBuses = mockBuses.filter((bus) => bus.status === "active");
  const openIssues = mockIssues.filter((issue) => issue.status !== "resolved");
  const corroborated = openIssues.filter((issue) => issue.observingBuses.length > 1);
  const criticalIssues = openIssues.filter((issue) => issue.severity === "critical");

  return [
    {
      id: "buses-sensing",
      label: "Buses sensing",
      value: String(activeBuses.length),
      sub: `of ${mockBuses.length} in fleet`,
    },
    {
      id: "observations",
      label: "Validated observations",
      value: String(mockEvents.length),
      // Raw edge-AI Detections outnumber validated Events because
      // low-confidence/redundant frames are filtered before promotion.
      sub: `from ${mockDetections.length} raw detections`,
    },
    {
      id: "open-issues",
      label: "Open issues",
      value: String(openIssues.length),
      sub: `${corroborated.length} corroborated by 2+ buses`,
    },
    {
      id: "critical",
      label: "Critical",
      value: String(criticalIssues.length),
      sub: criticalIssues.length > 0 ? "Needs action" : "None open",
      subTone: criticalIssues.length > 0 ? "alert" : undefined,
    },
  ];
}

interface DetectionDistributionBucket {
  bucket: TaxonomyBucket;
  count: number;
}

// Aggregates the same population as the "Active Observations" KPI —
// every validated Event, nothing else — into the PS taxonomy (see
// lib/taxonomy.ts). Deliberately does NOT fold in Infrastructure fixtures:
// those come from a separate asset-inspection domain that isn't part of
// the bus-camera Detection -> Event pipeline, and mixing them in previously
// made this chart's total silently diverge from "Active Observations".
function computeDetectionDistribution(): DetectionDistributionBucket[] {
  const counts = new Map<TaxonomyBucket, number>(DETECTION_TAXONOMY_BUCKETS.map((bucket) => [bucket, 0]));
  for (const event of mockEvents) {
    const bucket = bucketForSubtype(event.subtype);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  return DETECTION_TAXONOMY_BUCKETS.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 })).filter(
    (entry) => entry.count > 0,
  );
}

export interface EventActivityDay {
  day: string;
  count: number;
}

// Illustrative 7-day activity trend. The live fixtures only carry a single
// day of timestamps (there is no historical event-volume series to
// aggregate yet), so this is deliberately fixed, deterministic demo data —
// surfaced to callers so the UI can label it as such rather than presenting
// it as live telemetry.
const DEMO_EVENT_ACTIVITY: EventActivityDay[] = [
  { day: "Mon", count: 5 },
  { day: "Tue", count: 8 },
  { day: "Wed", count: 6 },
  { day: "Thu", count: 13 },
  { day: "Fri", count: 9 },
  { day: "Sat", count: 16 },
  { day: "Sun", count: 19 },
];

export interface VehicleClassCounts {
  cars: number;
  twoWheelers: number;
  buses: number;
  trucks: number;
}
export interface CorridorVehicleClassification {
  hotspotId: string;
  location: string;
  corridor: string;
  counts: VehicleClassCounts;
}

// PS §"vehicle detection, classification and counting" has no supporting
// fixture data yet — Fleet Drishti's fleet cameras currently detect road
// hazards/safety/congestion events, not per-vehicle class/count. This is a
// deterministic PROTOTYPE breakdown (seeded from each hotspot's real
// congestionLevel/observingBusCount, not random) so the UI can demonstrate
// the intended Detection -> Classification -> Counting flow without
// claiming a vehicle-classification model is in production. Every caller
// must surface this as demo/prototype data.
const CONGESTION_VOLUME_WEIGHT: Record<CongestionLevel, number> = { low: 6, medium: 10, high: 16, severe: 22 };
const CLASS_SPLIT: Record<keyof VehicleClassCounts, number> = { cars: 0.45, twoWheelers: 0.35, trucks: 0.1, buses: 0.1 };

function computeVehicleClassificationDemo(): CorridorVehicleClassification[] {
  return mockTrafficHotspots.map((hotspot) => {
    const base = hotspot.observingBusCount * CONGESTION_VOLUME_WEIGHT[hotspot.congestionLevel];
    return {
      hotspotId: hotspot.hotspotId,
      location: hotspot.location,
      corridor: hotspot.corridor,
      counts: {
        cars: Math.round(base * CLASS_SPLIT.cars),
        twoWheelers: Math.round(base * CLASS_SPLIT.twoWheelers),
        buses: Math.round(base * CLASS_SPLIT.buses),
        trucks: Math.round(base * CLASS_SPLIT.trucks),
      },
    };
  });
}

function computeCityAnalyticsSummary(): KpiTile[] {
  const resolvedIssues = mockIssues.filter((issue) => issue.status === "resolved");
  const openIssues = mockIssues.filter((issue) => issue.status !== "resolved");
  const avgConfidence = Math.round(mockEvents.reduce((sum, event) => sum + event.confidence, 0) / mockEvents.length);
  const avgObservationsPerIssue = (
    mockIssues.reduce((sum, issue) => sum + issue.observationCount, 0) / mockIssues.length
  ).toFixed(1);

  return [
    { id: "open-issues", label: "Open issues", value: String(openIssues.length) },
    { id: "resolved-issues", label: "Resolved issues", value: String(resolvedIssues.length) },
    { id: "avg-confidence", label: "Avg. detection confidence", value: `${avgConfidence}%`, sub: "Across validated events" },
    { id: "avg-fusion", label: "Observations per issue", value: avgObservationsPerIssue, sub: "Multi-bus fusion" },
  ];
}

export interface CorridorTrafficPattern {
  hotspotId: string;
  location: string;
  corridor: string;
  latitude: number;
  longitude: number;
  /** grid[day][hour] congestion index 0..1; day 0 = Monday. */
  grid: number[][];
}

// DEMO day × hour congestion pattern per monitored corridor. There is no
// historical, bus-derived traffic series yet, so this is a deterministic
// illustrative model — typical weekday AM/PM peaks, softer weekends —
// scaled by each corridor's real fixture congestionLevel. It is NOT a
// measurement; every caller must badge it DEMO. Replace with aggregated
// fleet traffic observations when they exist.
const PATTERN_BASE: Record<CongestionLevel, number> = { low: 0.4, medium: 0.58, high: 0.74, severe: 0.9 };

function bump(hour: number, centre: number, width: number): number {
  return Math.exp(-((hour - centre) ** 2) / (2 * width * width));
}

function computeTrafficPatternDemo(): CorridorTrafficPattern[] {
  return mockTrafficHotspots.map((hotspot, index) => {
    const base = PATTERN_BASE[hotspot.congestionLevel];
    // Small fixed per-corridor offsets so corridors don't peak in lockstep.
    const shift = (index % 3) * 0.5 - 0.5;
    const grid = Array.from({ length: 7 }, (_, day) => {
      const weekend = day >= 5;
      return Array.from({ length: 24 }, (_, hour) => {
        const am = bump(hour, 9.5 + shift, 1.5) * (weekend ? 0.45 : 1);
        const pm = bump(hour, 19 + shift, 1.8) * (weekend ? 0.7 : 1);
        const midday = bump(hour, 14, 3) * (weekend ? 0.55 : 0.4);
        const night = hour < 6 ? 0.05 : 0.12;
        const value = base * Math.max(night, Math.max(am, pm) * 0.95 + midday * 0.35);
        return Math.min(1, Math.round(value * 100) / 100);
      });
    });
    return {
      hotspotId: hotspot.hotspotId,
      location: hotspot.location,
      corridor: hotspot.corridor,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      grid,
    };
  });
}

export const analyticsService = {
  getCommandCenterKpis(): Promise<KpiTile[]> {
    return mockAsync(computeCommandCenterKpis());
  },

  getCityAnalyticsSummary(): Promise<KpiTile[]> {
    return mockAsync(computeCityAnalyticsSummary());
  },

  getDetectionDistribution(): Promise<DetectionDistributionBucket[]> {
    return mockAsync(computeDetectionDistribution());
  },

  // Explicitly a demo series — see DEMO_EVENT_ACTIVITY's doc comment.
  getEventActivityTrend(): Promise<EventActivityDay[]> {
    return mockAsync(DEMO_EVENT_ACTIVITY);
  },

  // Explicitly a prototype breakdown — see computeVehicleClassificationDemo's doc comment.
  getVehicleClassificationDemo(): Promise<CorridorVehicleClassification[]> {
    return mockAsync(computeVehicleClassificationDemo());
  },

  // Explicitly a DEMO pattern — see computeTrafficPatternDemo's doc comment.
  getTrafficPatternDemo(): Promise<CorridorTrafficPattern[]> {
    return mockAsync(computeTrafficPatternDemo());
  },
};
