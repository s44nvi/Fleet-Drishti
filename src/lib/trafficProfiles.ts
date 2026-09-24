import { TRAFFIC_AREAS, TRAFFIC_CORRIDORS, type CorridorDef, type SegmentDef } from "../data/traffic/corridors";
import type { CongestionLevel, SegmentTraffic, TrafficProfiles, TrafficSnapshot, TravelDirection } from "../types";

// Deterministic DEMO traffic model: trafficProfiles[day][hour][segmentId].
//
// Shape of a day (all illustrative, patterned on recurring Mumbai reporting):
// - weekdays: morning peak ~07–10 pushing towards the island city / BKC
//   (southbound WEH, EEH, LBS), evening peak ~17–21 pushing back out
//   (northbound), with a lower but persistent midday load around BKC,
//   Kurla, LBS Marg, Saki Naka, Andheri and Powai; free flow late at night.
// - Friday evenings run heavier; Monday mornings slightly heavier.
// - Saturday: weak commute, a busy shopping/leisure evening (Link Road,
//   Malad, Bandra, Dadar, Lower Parel). Sunday: quiet morning, moderate
//   leisure evening.
// Nothing here is a measurement. When bus-derived observations exist they
// fill the same TrafficProfiles shape and this module is retired.

export interface SegmentInfo {
  id: string;
  corridorId: string;
  corridor: string;
  short: string;
  kind: CorridorDef["kind"];
  from: string;
  to: string;
  forwardLabel: string;
  reverseLabel: string;
  freeFlowKph: number;
  def: SegmentDef;
  /** Anchor endpoints, [lng, lat], in forward order. */
  a: [number, number];
  b: [number, number];
  mid: [number, number];
}

export const TRAFFIC_SEGMENTS: SegmentInfo[] = TRAFFIC_CORRIDORS.flatMap((c) =>
  c.segments.map((def, i) => {
    const a = c.anchors[i];
    const b = c.anchors[i + 1];
    return {
      id: `${c.id}-${i}`,
      corridorId: c.id,
      corridor: c.name,
      short: c.short,
      kind: c.kind,
      from: a.name,
      to: b.name,
      forwardLabel: c.forwardLabel,
      reverseLabel: c.reverseLabel,
      freeFlowKph: c.freeFlowKph,
      def,
      a: [a.lng, a.lat] as [number, number],
      b: [b.lng, b.lat] as [number, number],
      mid: [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2] as [number, number],
    };
  }),
);

interface DayShape {
  am: number;
  pm: number;
  /** Evening leisure pull. */
  leisure: number;
  /** Weekend daytime shopping pull. */
  shopping: number;
  /** Hour the city wakes up. */
  wake: number;
}

const DAY_SHAPES: DayShape[] = [
  { am: 1.06, pm: 0.98, leisure: 0.1, shopping: 0, wake: 6.5 }, // Mon
  { am: 1, pm: 1, leisure: 0.1, shopping: 0, wake: 6.5 }, // Tue
  { am: 1, pm: 0.97, leisure: 0.12, shopping: 0, wake: 6.5 }, // Wed
  { am: 0.99, pm: 1.02, leisure: 0.14, shopping: 0, wake: 6.5 }, // Thu
  { am: 0.97, pm: 1.1, leisure: 0.35, shopping: 0, wake: 6.5 }, // Fri
  { am: 0.35, pm: 0.3, leisure: 0.9, shopping: 0.35, wake: 8 }, // Sat
  { am: 0.12, pm: 0.22, leisure: 0.72, shopping: 0.25, wake: 9.5 }, // Sun
];

const gauss = (h: number, mu: number, sigma: number) => Math.exp(-((h - mu) ** 2) / (2 * sigma * sigma));
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** 0 at night → 1 through the day. */
function daytime(h: number, wake: number) {
  return smooth((h - (wake - 1)) / 2.5) * (1 - smooth((h - 21.5) / 2.5));
}

/** Deterministic 0..1 noise so neighbouring stretches don't move in lockstep. */
function noise(key: string) {
  let x = 2166136261;
  for (let i = 0; i < key.length; i++) x = Math.imul(x ^ key.charCodeAt(i), 16777619);
  return ((x >>> 0) % 10007) / 10007;
}

interface LoadInput {
  base: number;
  midday?: number;
  leisure?: number;
  /** Share of the load that is office commute (areas); corridors = 1. */
  commute?: number;
}

/** Commute weight per direction: [am, pm]. Radial roads flow in at
 * the morning peak and out in the evening; cross links load both ways. */
function directionalWeights(kind: CorridorDef["kind"] | "area", dir: TravelDirection | null): [number, number] {
  if (dir === null || kind === "area") return [0.75, 0.75];
  if (kind === "radial") return dir === "forward" ? [1, 0.5] : [0.5, 1];
  return dir === "forward" ? [0.9, 0.75] : [0.75, 0.9];
}

function load(input: LoadInput, kind: CorridorDef["kind"] | "area", day: number, hour: number, dir: TravelDirection | null, key: string) {
  const s = DAY_SHAPES[day];
  const h = hour + 0.5; // centre of the hour slot
  const plateau = 0.14 + (0.36 + (input.midday ?? 0)) * daytime(h, s.wake);
  const [amW, pmW] = directionalWeights(kind, dir);
  const commute = 0.34 * (input.commute ?? 1) * (gauss(h, 9.2, 1.35) * s.am * amW + gauss(h, 19, 1.6) * s.pm * pmW);
  const pull = input.leisure ?? 0.15;
  const leisure = pull * (0.5 * s.leisure * gauss(h, 19.5, 2.1) + s.shopping * gauss(h, 14, 2.5));
  const value = input.base * (plateau + commute + leisure) + (noise(`${key}|${day}|${hour}|${dir}`) - 0.5) * 0.06;
  return Math.min(0.98, Math.max(0.03, value));
}

export function levelFor(index: number): CongestionLevel {
  if (index < 0.35) return "low";
  if (index < 0.55) return "medium";
  if (index < 0.75) return "high";
  return "severe";
}

export function speedFor(index: number, freeFlowKph: number) {
  return Math.max(6, Math.round(freeFlowKph * (1 - 0.8 * index)));
}

function snapshot(day: number, hour: number): TrafficSnapshot {
  const segments: Record<string, SegmentTraffic> = {};
  for (const seg of TRAFFIC_SEGMENTS) {
    const forward = load(seg.def, seg.kind, day, hour, "forward", seg.id);
    const reverse = load(seg.def, seg.kind, day, hour, "reverse", seg.id);
    const intensity = Math.max(forward, reverse);
    segments[seg.id] = {
      segmentId: seg.id,
      forward,
      reverse,
      intensity,
      direction: forward >= reverse ? "forward" : "reverse",
      speedKph: speedFor(intensity, seg.freeFlowKph),
      level: levelFor(intensity),
      confidence: 0.6,
      status: "demo",
    };
  }
  const areas: TrafficSnapshot["areas"] = {};
  for (const area of TRAFFIC_AREAS) {
    areas[area.id] = { areaId: area.id, intensity: load(area, "area", day, hour, null, area.id) };
  }
  return { segments, areas };
}

let cached: TrafficProfiles | null = null;

/** trafficProfiles[day 0 = Monday][hour] — DEMO. */
export function buildTrafficProfiles(): TrafficProfiles {
  cached ??= Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => snapshot(d, h)));
  return cached;
}

// --- Summaries --------------------------------------------------------------

/** Network congestion index for one snapshot: mean over stretches of the
 * busier direction of travel. */
export function networkIndex(s: TrafficSnapshot): number {
  const values = Object.values(s.segments);
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v.intensity, 0) / values.length;
}

export function segmentStretch(seg: SegmentInfo, dir: TravelDirection) {
  return dir === "forward" ? `${seg.from} → ${seg.to}` : `${seg.to} → ${seg.from}`;
}

export function directionLabel(seg: SegmentInfo, dir: TravelDirection) {
  return dir === "forward" ? seg.forwardLabel : seg.reverseLabel;
}

/** grid[day][hour] of a corridor's mean index — for the weekly pattern grid. */
export function corridorGrid(profiles: TrafficProfiles, corridorId: string): number[][] {
  const ids = TRAFFIC_SEGMENTS.filter((s) => s.corridorId === corridorId).map((s) => s.id);
  return profiles.map((day) =>
    day.map((snap) => ids.reduce((sum, id) => sum + (snap.segments[id].forward + snap.segments[id].reverse) / 2, 0) / (ids.length || 1)),
  );
}
