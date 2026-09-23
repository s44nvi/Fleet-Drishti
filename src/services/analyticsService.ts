import type { CongestionLevel, KpiTile } from "../types";
import { mockBuses, mockEvents, mockDetections, mockIssues, mockRoutes, mockTrafficHotspots } from "../data/mock";
import { DETECTION_TAXONOMY_BUCKETS, bucketForSubtype, type TaxonomyBucket } from "../lib/taxonomy";
import { mockAsync } from "./mockAsync";

export type { TaxonomyBucket };

// Every number here is derived from the mock fixtures at call time — none
// of it is a hardcoded display string. When this swaps to a real backend,
// it will aggregate over live data the same way.
//
// Exactly four KPIs by design (see Command Center spec) — do not add more
// here without also updating the Command Center's "answer in 5 seconds"
// rationale.
function computeCommandCenterKpis(): KpiTile[] {
  const activeBuses = mockBuses.filter((bus) => bus.status === "active");
  const idleBuses = mockBuses.filter((bus) => bus.status !== "active");
  const priorityIssues = mockIssues.filter(
    (issue) => issue.status !== "resolved" && (issue.severity === "critical" || issue.severity === "high"),
  );
  const criticalIssues = priorityIssues.filter((issue) => issue.severity === "critical");
  const totalCorridorKm = mockRoutes.reduce((sum, route) => sum + route.distanceKm, 0);
  const coveragePercent = Math.round((activeBuses.length / mockBuses.length) * 100);

  return [
    {
      id: "connected-buses",
      label: "Connected Buses",
      value: String(activeBuses.length),
      valueLabel: "Active",
      badge: "Live",
      badgeTone: "live",
      delta: `${idleBuses.length} Idle`,
      deltaTone: "neutral",
      caption: "Public Transport Fleet",
    },
    {
      id: "active-observations",
      label: "Active Observations",
      value: String(mockEvents.length),
      badge: "Ingesting",
      badgeTone: "info",
      // Raw edge-AI Detections (mockDetections) outnumber validated
      // Observations (mockEvents) because low-confidence/redundant frames
      // are filtered before promotion — see data/mock/detections.ts.
      delta: `${mockDetections.length} Raw Detections`,
      deltaTone: "neutral",
      caption: "Validated after confidence filtering",
    },
    {
      id: "priority-issues",
      label: "Priority Issues",
      value: String(priorityIssues.length),
      delta: criticalIssues.length > 0 ? `${criticalIssues.length} Critical` : "None Critical",
      deltaTone: criticalIssues.length > 0 ? "negative" : "neutral",
      caption: "Awaiting Government Action",
    },
    {
      id: "fleet-coverage",
      label: "Fleet Coverage",
      value: totalCorridorKm.toFixed(1),
      valueLabel: "km",
      caption: `${coveragePercent}% Network Coverage`,
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
    {
      id: "open-issues",
      label: "Open Issues",
      value: String(openIssues.length),
      badge: "Action Required",
      badgeTone: "critical",
      caption: "Awaiting government action",
    },
    {
      id: "resolved-issues",
      label: "Resolved Issues",
      value: String(resolvedIssues.length),
      badge: "Closed",
      badgeTone: "success",
      caption: "Confirmed follow-up complete",
    },
    {
      id: "avg-confidence",
      label: "Avg. Detection Confidence",
      value: `${avgConfidence}%`,
      badgeTone: "info",
      caption: "Across all validated events",
    },
    {
      id: "avg-fusion",
      label: "Avg. Buses per Issue",
      value: avgObservationsPerIssue,
      badgeTone: "info",
      caption: "Multi-bus observation fusion",
    },
  ];
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
};
