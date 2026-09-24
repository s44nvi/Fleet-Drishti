import { TRAFFIC_AREAS, TRAFFIC_CORRIDORS } from "../data/traffic/corridors";
import type { CorridorRoad, NetworkRouteLine, TrafficSnapshot, TravelDirection } from "../types";
import { TRAFFIC_SEGMENTS } from "./trafficProfiles";

// Joins per-segment congestion values onto real road geometry and renders
// them as a soft city-wide heat raster. Inputs are a TrafficSnapshot, so the
// same functions work unchanged when the DEMO profiles are replaced by real
// bus-derived traffic observations.

type Coord = [number, number];

interface FieldRoad {
  coordinates: Coord[];
  /** Index into TRAFFIC_SEGMENTS, or -1 for a road that is not part of a
   * modelled corridor. */
  segment: number;
  /** Which carriageway; "both" for two-way roads. */
  direction: TravelDirection | "both";
  /** How strongly the road shows on the heat layer. */
  presence: number;
  /** Road class share of nearby area congestion. */
  classFactor: number;
  areas: { index: number; falloff: number }[];
}

export interface TrafficField {
  roads: FieldRoad[];
  /** Road-sample positions in raster pixels, and the road each belongs to. */
  sampleX: Float32Array;
  sampleY: Float32Array;
  sampleRoad: Uint32Array;
  /** Which segments have any mapped road (others are skipped in rankings). */
  mappedSegments: Set<string>;
}

// Raster covering Greater Mumbai: [west, south, east, north].
const BOUNDS = [72.79, 18.89, 72.99, 19.27] as const;
const CELL_M = 60;
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG = 111_320 * Math.cos((19.08 * Math.PI) / 180);
export const RASTER_WIDTH = Math.round(((BOUNDS[2] - BOUNDS[0]) * M_PER_DEG_LNG) / CELL_M);
export const RASTER_HEIGHT = Math.round(((BOUNDS[3] - BOUNDS[1]) * M_PER_DEG_LAT) / CELL_M);
export const RASTER_COORDINATES: [Coord, Coord, Coord, Coord] = [
  [BOUNDS[0], BOUNDS[3]],
  [BOUNDS[2], BOUNDS[3]],
  [BOUNDS[2], BOUNDS[1]],
  [BOUNDS[0], BOUNDS[1]],
];

const SAMPLE_M = 110;
const SIGMA_PX = 250 / CELL_M;
const KERNEL_R = Math.ceil(SIGMA_PX * 2.6);
const ASSIGN_M = 1300;

const PRESENCE: Record<string, number> = {
  motorway: 0.9,
  trunk: 0.9,
  motorway_link: 0.55,
  trunk_link: 0.55,
  primary: 0.7,
  primary_link: 0.5,
  secondary: 0.35,
};
const CLASS_FACTOR: Record<string, number> = { motorway: 1, trunk: 1, primary: 0.9, secondary: 0.75 };

function metres(a: Coord, b: Coord) {
  return Math.hypot((a[0] - b[0]) * M_PER_DEG_LNG, (a[1] - b[1]) * M_PER_DEG_LAT);
}

function distanceToSegment(p: Coord, a: Coord, b: Coord) {
  const ax = (a[0] - p[0]) * M_PER_DEG_LNG;
  const ay = (a[1] - p[1]) * M_PER_DEG_LAT;
  const dx = (b[0] - a[0]) * M_PER_DEG_LNG;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Precompute, once, which corridor stretch each road belongs to, the areas
 * that load it, and the raster samples along it. */
export function buildTrafficField(roads: CorridorRoad[]): TrafficField {
  const segmentIndex = new Map(TRAFFIC_SEGMENTS.map((s, i) => [s.id, i]));
  const fieldRoads: FieldRoad[] = [];
  const mappedSegments = new Set<string>();

  for (const road of roads) {
    if (road.coordinates.length < 2) continue;
    const mid = road.coordinates[Math.floor(road.coordinates.length / 2)];

    let segment = -1;
    let bestDistance = ASSIGN_M;
    for (const corridor of TRAFFIC_CORRIDORS) {
      if (!corridor.match({ name: road.name, ref: road.ref, highway: road.highway, mid })) continue;
      corridor.segments.forEach((_, i) => {
        const a = corridor.anchors[i];
        const b = corridor.anchors[i + 1];
        const d = distanceToSegment(mid, [a.lng, a.lat], [b.lng, b.lat]);
        if (d < bestDistance) {
          bestDistance = d;
          segment = segmentIndex.get(`${corridor.id}-${i}`) ?? -1;
        }
      });
    }

    let direction: FieldRoad["direction"] = "both";
    if (segment >= 0) {
      const seg = TRAFFIC_SEGMENTS[segment];
      mappedSegments.add(seg.id);
      if (road.oneway) {
        const first = road.coordinates[0];
        const last = road.coordinates[road.coordinates.length - 1];
        const dot = (last[0] - first[0]) * (seg.b[0] - seg.a[0]) * M_PER_DEG_LNG ** 2 + (last[1] - first[1]) * (seg.b[1] - seg.a[1]) * M_PER_DEG_LAT ** 2;
        direction = dot >= 0 ? "forward" : "reverse";
      }
    }

    const areas: FieldRoad["areas"] = [];
    TRAFFIC_AREAS.forEach((area, index) => {
      const d = metres(mid, [area.lng, area.lat]);
      if (d < area.radiusM) areas.push({ index, falloff: Math.pow(1 - d / area.radiusM, 0.8) });
    });

    fieldRoads.push({
      coordinates: road.coordinates,
      segment,
      direction,
      presence: segment >= 0 ? 1 : (PRESENCE[road.highway] ?? 0.35),
      classFactor: CLASS_FACTOR[road.highway.replace("_link", "")] ?? 0.75,
      areas,
    });
  }

  // Samples every ~SAMPLE_M along every road, in raster pixel space.
  const xs: number[] = [];
  const ys: number[] = [];
  const ids: number[] = [];
  const toPx = ([lng, lat]: Coord): Coord => [
    ((lng - BOUNDS[0]) * M_PER_DEG_LNG) / CELL_M,
    ((BOUNDS[3] - lat) * M_PER_DEG_LAT) / CELL_M,
  ];
  fieldRoads.forEach((road, r) => {
    for (let k = 1; k < road.coordinates.length; k++) {
      const [x0, y0] = toPx(road.coordinates[k - 1]);
      const [x1, y1] = toPx(road.coordinates[k]);
      const steps = Math.max(1, Math.ceil((Math.hypot(x1 - x0, y1 - y0) * CELL_M) / SAMPLE_M));
      for (let s = k === 1 ? 0 : 1; s <= steps; s++) {
        xs.push(x0 + ((x1 - x0) * s) / steps);
        ys.push(y0 + ((y1 - y0) * s) / steps);
        ids.push(r);
      }
    }
  });

  return {
    roads: fieldRoads,
    sampleX: Float32Array.from(xs),
    sampleY: Float32Array.from(ys),
    sampleRoad: Uint32Array.from(ids),
    mappedSegments,
  };
}

/** Background load on a road outside the modelled corridors: the city's
 * general level for that hour, lifted near busy areas. */
function roadWeight(road: FieldRoad, snap: TrafficSnapshot, ambient: number): number {
  if (road.segment >= 0) {
    const s = snap.segments[TRAFFIC_SEGMENTS[road.segment].id];
    if (road.direction === "forward") return s.forward;
    if (road.direction === "reverse") return s.reverse;
    return s.intensity;
  }
  let w = ambient * road.classFactor;
  for (const a of road.areas) w = Math.max(w, 0.85 * snap.areas[TRAFFIC_AREAS[a.index].id].intensity * a.falloff * road.classFactor);
  return w;
}

function ambientLevel(snap: TrafficSnapshot) {
  const areas = Object.values(snap.areas);
  return (0.35 * areas.reduce((s, a) => s + a.intensity, 0)) / (areas.length || 1);
}

export function roadWeights(field: TrafficField, snap: TrafficSnapshot): Float32Array {
  const ambient = ambientLevel(snap);
  return Float32Array.from(field.roads, (road) => roadWeight(road, snap, ambient));
}

// Colour ramp shared with congestionColor(): green → yellow → orange → red.
const RAMP: [number, [number, number, number]][] = [
  [0, [47, 174, 99]],
  [0.35, [214, 201, 58]],
  [0.55, [240, 146, 43]],
  [0.75, [225, 60, 44]],
  [1, [185, 28, 28]],
];
const LUT = (() => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let j = 1;
    while (j < RAMP.length - 1 && v > RAMP[j][0]) j++;
    const [t0, c0] = RAMP[j - 1];
    const [t1, c1] = RAMP[j];
    const k = Math.min(1, Math.max(0, (v - t0) / (t1 - t0)));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * k;
  }
  return lut;
})();

const KERNEL = (() => {
  const size = KERNEL_R * 2 + 1;
  const k = new Float32Array(size * size);
  for (let dy = -KERNEL_R; dy <= KERNEL_R; dy++)
    for (let dx = -KERNEL_R; dx <= KERNEL_R; dx++)
      k[(dy + KERNEL_R) * size + dx + KERNEL_R] = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA_PX * SIGMA_PX));
  return k;
})();

/**
 * Soft heat raster (PNG data URL) for one snapshot. Each pixel's colour is
 * the kernel-weighted congestion of the roads around it — biased towards the
 * busier road where roads meet — and its opacity follows road proximity and
 * congestion, so quiet roads stay a faint tint and busy corridors glow.
 * Colour never comes from point density, so dense road grids don't turn red
 * on their own.
 */
export function renderHeatRaster(field: TrafficField, weights: Float32Array): string {
  const W = RASTER_WIDTH;
  const H = RASTER_HEIGHT;
  const sumW = new Float32Array(W * H);
  const sumK = new Float32Array(W * H);
  const maxK = new Float32Array(W * H);
  const size = KERNEL_R * 2 + 1;

  for (let i = 0; i < field.sampleRoad.length; i++) {
    const r = field.sampleRoad[i];
    const w = weights[r];
    const presence = field.roads[r].presence;
    const bias = presence * (0.25 + w);
    const cx = Math.round(field.sampleX[i]);
    const cy = Math.round(field.sampleY[i]);
    const y0 = Math.max(0, cy - KERNEL_R);
    const y1 = Math.min(H - 1, cy + KERNEL_R);
    const x0 = Math.max(0, cx - KERNEL_R);
    const x1 = Math.min(W - 1, cx + KERNEL_R);
    for (let y = y0; y <= y1; y++) {
      const row = y * W;
      const krow = (y - cy + KERNEL_R) * size + KERNEL_R - cx;
      for (let x = x0; x <= x1; x++) {
        const k = KERNEL[krow + x];
        const p = row + x;
        const kb = k * bias;
        sumW[p] += kb * w;
        sumK[p] += kb;
        const kp = k * presence;
        if (kp > maxK[p]) maxK[p] = kp;
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(W, H);
  const px = img.data;
  for (let p = 0; p < W * H; p++) {
    const k = maxK[p];
    if (k < 0.03) continue;
    const v = sumW[p] / sumK[p];
    const li = Math.min(255, Math.max(0, Math.round(v * 255))) * 3;
    const o = p * 4;
    px[o] = LUT[li];
    px[o + 1] = LUT[li + 1];
    px[o + 2] = LUT[li + 2];
    // Quiet roads: a faint tint. Busy corridors: a stronger glow.
    px[o + 3] = Math.round(255 * Math.min(1, k * 1.15) * (0.12 + 0.8 * Math.pow(Math.min(1, v * 1.1), 1.3)));
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Crisp per-carriageway lines, faded in only when zoomed in. */
export function congestionRoads(field: TrafficField, weights: Float32Array, selectedSegment: string | null) {
  const out: { coordinates: Coord[]; weight: number; emphasis: boolean }[] = [];
  field.roads.forEach((road, i) => {
    if (road.segment < 0 && (weights[i] < 0.3 || road.presence < 0.6)) return;
    out.push({
      coordinates: road.coordinates,
      weight: weights[i],
      emphasis: road.segment >= 0 && TRAFFIC_SEGMENTS[road.segment].id === selectedSegment,
    });
  });
  return out;
}

// --- Route estimates --------------------------------------------------------

export interface CorridorPoint {
  id: string;
  latitude: number;
  longitude: number;
}

const BASELINE = 0.12;
// A route feels a stretch from further away than a single road does.
const ROUTE_RADIUS_M = 2500;

/** Congestion felt along a route polyline: mean over its vertices. */
function routeIndex(coords: Coord[], points: CorridorPoint[], values: number[]): number {
  if (coords.length === 0) return BASELINE;
  let sum = 0;
  for (const [lng, lat] of coords) {
    let w = BASELINE;
    points.forEach((c, i) => {
      const d = metres([c.longitude, c.latitude], [lng, lat]);
      if (d < ROUTE_RADIUS_M) w = Math.max(w, values[i] * Math.pow(1 - d / ROUTE_RADIUS_M, 0.6));
    });
    sum += w;
  }
  return sum / coords.length;
}

/** Illustrative speed model for an index — used only for DEMO estimates. */
function busSpeedFor(index: number) {
  return Math.max(8, 34 * (1 - 0.7 * index));
}

export interface RouteEstimate {
  minutes: number;
  usualMinutes: number;
  deltaPct: number;
  trend: number[];
}

/** `grids[point][day][hour]` congestion per point. */
export function estimateRoute(
  line: NetworkRouteLine | undefined,
  distanceKm: number,
  points: CorridorPoint[],
  grids: number[][][],
  day: number,
  hour: number,
): RouteEstimate {
  const coords = (line?.geometry.coordinates ?? []) as Coord[];
  const valuesAt = (d: number, h: number) => grids.map((g) => g[d][h]);
  const usualAt = (h: number) => grids.map((g) => g.reduce((s, row) => s + row[h], 0) / g.length);
  const now = routeIndex(coords, points, valuesAt(day, hour));
  const usual = routeIndex(coords, points, usualAt(hour));
  const minutes = (distanceKm / busSpeedFor(now)) * 60;
  const usualMinutes = (distanceKm / busSpeedFor(usual)) * 60;
  return {
    minutes,
    usualMinutes,
    deltaPct: ((minutes - usualMinutes) / usualMinutes) * 100,
    trend: Array.from({ length: 24 }, (_, h) => routeIndex(coords, points, valuesAt(day, h))),
  };
}
