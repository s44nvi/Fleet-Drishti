import type { Bus, CongestionLevel, KpiTile } from "../types";
import { mockBuses, mockEvents, mockDetections, mockIssues, mockRoutes, mockTrafficHotspots } from "../data/mock";
import { PUBLIC_CITY_INSIGHTS, type PublicCityInsight } from "../data/external/publicReports";
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

// ---------------------------------------------------------------------------
// Analytics workspace
// ---------------------------------------------------------------------------

// The fixture snapshot's "as of" day — every fixture record is from this
// morning, so period trends end here too.
export const ANALYTICS_AS_OF = "2026-09-12";

export interface FleetContribution {
  busId: string;
  routeId: string;
  routeLabel: string;
  status: Bus["status"];
  observations: number;
  corroborated: number;
  avgConfidence: number | null;
}

export interface AnalyticsSnapshot {
  asOf: string;
  rawDetections: number;
  validatedObservations: number;
  /** Validated observations that belong to an issue seen by 2+ buses. */
  corroboratedObservations: number;
  singleBusObservations: number;
  issuesCreated: number;
  activeIssues: number;
  actionRequired: number;
  avgConfidence: number;
  busesContributing: number;
  fleetSize: number;
  routesCovered: number;
  routesTotal: number;
  /** Every raw detection's confidence and whether validation promoted it. */
  detectionConfidences: { detectionId: string; confidence: number; promoted: boolean }[];
  fleet: FleetContribution[];
}

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

function shortStop(name: string): string {
  return name.replace(/ Bus Station| Depot/g, "");
}

// Fixture-derived — the same records every other page reads, aggregated.
function computeAnalyticsSnapshot(): AnalyticsSnapshot {
  const corroboratedIds = new Set(
    mockIssues.filter((issue) => issue.observingBuses.length > 1).flatMap((issue) => issue.relatedEventIds),
  );
  const corroborated = mockEvents.filter((event) => corroboratedIds.has(event.eventId)).length;
  const openIssues = mockIssues.filter((issue) => issue.status !== "resolved");

  const fleet: FleetContribution[] = mockBuses
    .map((bus) => {
      const events = mockEvents.filter((event) => event.busId === bus.busId);
      const route = mockRoutes.find((r) => r.routeId === bus.routeId);
      return {
        busId: bus.busId,
        routeId: bus.routeId,
        routeLabel: route
          ? `${route.name} · ${shortStop(route.origin)} → ${shortStop(route.destination)}`
          : bus.routeId,
        status: bus.status,
        observations: events.length,
        corroborated: events.filter((event) => corroboratedIds.has(event.eventId)).length,
        avgConfidence: average(events.map((event) => event.confidence)),
      };
    })
    .sort((a, b) => b.observations - a.observations || (b.avgConfidence ?? 0) - (a.avgConfidence ?? 0));

  return {
    asOf: ANALYTICS_AS_OF,
    rawDetections: mockDetections.length,
    validatedObservations: mockEvents.length,
    corroboratedObservations: corroborated,
    singleBusObservations: mockEvents.length - corroborated,
    issuesCreated: mockIssues.length,
    activeIssues: openIssues.length,
    actionRequired: openIssues.filter((issue) => issue.status === "action-required").length,
    avgConfidence: average(mockEvents.map((event) => event.confidence)) ?? 0,
    busesContributing: new Set(mockEvents.map((event) => event.busId)).size,
    fleetSize: mockBuses.length,
    routesCovered: new Set(mockEvents.map((event) => event.routeId)).size,
    routesTotal: mockRoutes.length,
    detectionConfidences: mockDetections.map((d) => ({
      detectionId: d.detectionId,
      confidence: d.confidence,
      promoted: Boolean(d.eventId),
    })),
    fleet,
  };
}

// --- DEMO period model -------------------------------------------------------
//
// The fixtures hold a single morning, so there is no observation history to
// aggregate. The Analytics trend, category mix and location ranking are a
// deterministic ILLUSTRATIVE model — every caller must badge it DEMO. It is
// shaped by what we do know: the category mix of the fixture events, a
// monsoon (Jun–Sep) rain signal that lifts potholes and waterlogging,
// weekday commute load on traffic/safety, and the corridor weighting used by
// the Traffic page's DEMO model. Seeded by date, so every range is a slice of
// one series (7 days is the tail of 30, which is the tail of 90).

export const ANALYTICS_DOMAINS = ["Road Issues", "Traffic", "Safety", "Infrastructure"] as const;
export type AnalyticsDomain = (typeof ANALYTICS_DOMAINS)[number];

export const ANALYTICS_CATEGORIES = [
  "Pothole",
  "Traffic / Congestion",
  "Pedestrian Safety",
  "Waterlogging",
  "Road Damage",
  "Missing Infrastructure",
  "Other",
] as const;
export type AnalyticsCategory = (typeof ANALYTICS_CATEGORIES)[number];

// Waterlogging is drainage failure, so it rolls up to Infrastructure here
// (it sits in the PS infrastructure taxonomy too — see lib/taxonomy.ts).
export const CATEGORY_DOMAIN: Record<AnalyticsCategory, AnalyticsDomain> = {
  Pothole: "Road Issues",
  "Road Damage": "Road Issues",
  Other: "Road Issues",
  "Traffic / Congestion": "Traffic",
  "Pedestrian Safety": "Safety",
  Waterlogging: "Infrastructure",
  "Missing Infrastructure": "Infrastructure",
};

// Mean observations/day on a dry weekday.
const CATEGORY_BASE_RATE: Record<AnalyticsCategory, number> = {
  Pothole: 3.1,
  "Traffic / Congestion": 2.9,
  "Pedestrian Safety": 2.1,
  Waterlogging: 0.5,
  "Road Damage": 1.1,
  "Missing Infrastructure": 0.8,
  Other: 0.35,
};
// How strongly rain (0..1) lifts each category.
const CATEGORY_RAIN_LIFT: Record<AnalyticsCategory, number> = {
  Pothole: 1.1,
  "Traffic / Congestion": 0.45,
  "Pedestrian Safety": 0.1,
  Waterlogging: 5,
  "Road Damage": 0.8,
  "Missing Infrastructure": 0.1,
  Other: 0.3,
};
const WEEKDAY_SENSITIVE = new Set<AnalyticsCategory>(["Traffic / Congestion", "Pedestrian Safety"]);

// Illustrative heavy-rain spells layered on the monsoon season curve.
const RAIN_SPELLS = ["2026-06-16", "2026-07-07", "2026-07-25", "2026-08-16", "2026-08-19", "2026-09-02"];
const DAY_MS = 86_400_000;

function dayIndex(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

function rainOn(index: number): number {
  const month = new Date(index * DAY_MS).getUTCMonth() + 1;
  const season = month >= 6 && month <= 9 ? [0.35, 0.45, 0.4, 0.2][month - 6] : 0.02;
  const spells = RAIN_SPELLS.reduce((sum, spell) => sum + Math.exp(-((index - dayIndex(spell)) ** 2) / 3), 0);
  return Math.min(1, season + spells * 0.65);
}

// Integer hash → [0, 1): deterministic per-day, per-category variation.
function noise(index: number, salt: number): number {
  let h = (index * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export interface ObservationDay {
  date: string;
  byCategory: Record<AnalyticsCategory, number>;
  byDomain: Record<AnalyticsDomain, number>;
  total: number;
}

function observationDay(index: number): ObservationDay {
  const weekday = new Date(index * DAY_MS).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  const rain = rainOn(index);
  const byCategory = {} as Record<AnalyticsCategory, number>;
  const byDomain = Object.fromEntries(ANALYTICS_DOMAINS.map((d) => [d, 0])) as Record<AnalyticsDomain, number>;
  ANALYTICS_CATEGORIES.forEach((category, salt) => {
    const weekFactor = WEEKDAY_SENSITIVE.has(category) && weekend ? 0.68 : 1;
    const mean = CATEGORY_BASE_RATE[category] * (1 + CATEGORY_RAIN_LIFT[category] * rain) * weekFactor;
    const count = Math.max(0, Math.round(mean * (0.72 + noise(index, salt + 1) * 0.56)));
    byCategory[category] = count;
    byDomain[CATEGORY_DOMAIN[category]] += count;
  });
  const total = Object.values(byDomain).reduce((a, b) => a + b, 0);
  return { date: new Date(index * DAY_MS).toISOString().slice(0, 10), byCategory, byDomain, total };
}

export interface ObservationPeriod {
  days: ObservationDay[];
  /** The same-length window immediately before `days`, for period-over-period change. */
  previous: ObservationDay[];
}

function computeObservationPeriodDemo(rangeDays: number): ObservationPeriod {
  const end = dayIndex(ANALYTICS_AS_OF);
  const series = (from: number) => Array.from({ length: rangeDays }, (_, i) => observationDay(from + i));
  return { days: series(end - rangeDays + 1), previous: series(end - 2 * rangeDays + 1) };
}

// Illustrative share of each domain's observations per location. Weighted
// after the fixture hotspots (WEH severe, BKC / EEH high, Sion medium,
// Hindmata waterlogging) and recurring public reporting (eastern-suburb
// potholes along JVLR / LBS Marg). Each domain column sums to 1.
interface LocationDef {
  id: string;
  name: string;
  stretch: string;
  share: Record<AnalyticsDomain, number>;
}
const LOCATIONS: LocationDef[] = [
  { id: "weh", name: "Western Express Highway", stretch: "Andheri → Goregaon", share: { "Road Issues": 0.22, Traffic: 0.26, Safety: 0.14, Infrastructure: 0.12 } },
  { id: "eeh", name: "Eastern Express Highway", stretch: "Ghatkopar → Vikhroli", share: { "Road Issues": 0.16, Traffic: 0.2, Safety: 0.1, Infrastructure: 0.1 } },
  { id: "bkc", name: "BKC", stretch: "Kalanagar → Kurla", share: { "Road Issues": 0.08, Traffic: 0.16, Safety: 0.18, Infrastructure: 0.08 } },
  { id: "jvlr", name: "JVLR", stretch: "Jogeshwari → Powai", share: { "Road Issues": 0.16, Traffic: 0.12, Safety: 0.06, Infrastructure: 0.08 } },
  { id: "lbs", name: "LBS Marg", stretch: "Kurla → Ghatkopar", share: { "Road Issues": 0.12, Traffic: 0.1, Safety: 0.12, Infrastructure: 0.12 } },
  { id: "sion", name: "Sion Circle", stretch: "Sion → Dharavi", share: { "Road Issues": 0.06, Traffic: 0.06, Safety: 0.22, Infrastructure: 0.14 } },
  { id: "hindmata", name: "Hindmata / Dadar", stretch: "Dadar TT → Parel", share: { "Road Issues": 0.08, Traffic: 0.04, Safety: 0.06, Infrastructure: 0.26 } },
  { id: "sclr", name: "SCLR", stretch: "Vakola → Chembur", share: { "Road Issues": 0.12, Traffic: 0.06, Safety: 0.12, Infrastructure: 0.1 } },
];

export interface LocationActivity {
  id: string;
  name: string;
  stretch: string;
  byDomain: Record<AnalyticsDomain, number>;
  total: number;
}

// Splits a (DEMO) period's domain totals across locations — pure, so the
// page can derive it from whichever period it already holds.
export function locationActivityForPeriod(period: ObservationPeriod): LocationActivity[] {
  const domainTotals = Object.fromEntries(
    ANALYTICS_DOMAINS.map((d) => [d, period.days.reduce((sum, day) => sum + day.byDomain[d], 0)]),
  ) as Record<AnalyticsDomain, number>;
  return LOCATIONS.map((loc) => {
    const byDomain = Object.fromEntries(
      ANALYTICS_DOMAINS.map((d) => [d, Math.round(domainTotals[d] * loc.share[d])]),
    ) as Record<AnalyticsDomain, number>;
    return {
      id: loc.id,
      name: loc.name,
      stretch: loc.stretch,
      byDomain,
      total: Object.values(byDomain).reduce((a, b) => a + b, 0),
    };
  });
}

export const analyticsService = {
  // Fixture snapshot — the simulated fleet's records, aggregated.
  getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
    return mockAsync(computeAnalyticsSnapshot());
  },

  // Explicitly a DEMO series — see the "DEMO period model" comment above.
  getObservationPeriodDemo(rangeDays: number): Promise<ObservationPeriod> {
    return mockAsync(computeObservationPeriodDemo(rangeDays));
  },

  // Published external reporting — never fleet data. See data/external.
  getPublicCityInsights(): Promise<PublicCityInsight[]> {
    return mockAsync(PUBLIC_CITY_INSIGHTS);
  },

  getCommandCenterKpis(): Promise<KpiTile[]> {
    return mockAsync(computeCommandCenterKpis());
  },

  getDetectionDistribution(): Promise<DetectionDistributionBucket[]> {
    return mockAsync(computeDetectionDistribution());
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
