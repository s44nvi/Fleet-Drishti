import type { CorridorRoad, NetworkRouteLine } from "../types";

// Joins per-corridor congestion values onto real road geometry, and derives
// the Traffic page's estimates from them. Inputs are plain numbers per
// corridor, so the same functions work unchanged when the DEMO pattern is
// replaced by real bus-derived traffic observations.

export interface CorridorPoint {
  hotspotId: string;
  corridor: string;
  latitude: number;
  longitude: number;
}

interface Influence {
  corridor: number;
  falloff: number;
  named: boolean;
}

export interface RoadField {
  roads: { coordinates: [number, number][]; classFactor: number; influences: Influence[]; mid: [number, number] }[];
}

const FIELD_RADIUS_M = 3500;
const NAMED_RADIUS_M = 6000;
const BASELINE = 0.12;
// A route feels a corridor from further away than a single road does.
const ROUTE_RADIUS_M = 7000;

const CLASS_FACTOR: Record<string, number> = {
  motorway: 1,
  trunk: 1,
  motorway_link: 0.85,
  trunk_link: 0.85,
  primary: 0.92,
  secondary: 0.8,
};

// OSM names of each fixture corridor's own road(s).
function corridorRoadPattern(corridor: string): RegExp {
  const c = corridor.toLowerCase();
  if (c.includes("western express")) return /western express/i;
  if (c.includes("eastern express")) return /eastern express|eastern freeway/i;
  if (c.includes("lbs")) return /lal bahadur shastri|lbs marg|sion circle|sion flyover/i;
  if (c.includes("bkc")) return /bandra kurla|\bbkc\b/i;
  return new RegExp(corridor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function metres(aLat: number, aLng: number, bLat: number, bLng: number) {
  const kx = 111_320 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot((aLng - bLng) * kx, (aLat - bLat) * 110_540);
}

function midpoint(coords: [number, number][]): [number, number] {
  return coords[Math.floor(coords.length / 2)] ?? coords[0];
}

// Precompute, once, how strongly each road is influenced by each corridor.
export function buildRoadField(roads: CorridorRoad[], corridors: CorridorPoint[]): RoadField {
  const patterns = corridors.map((c) => corridorRoadPattern(c.corridor));
  return {
    roads: roads
      .filter((r) => r.coordinates.length >= 2)
      .map((road) => {
        const mid = midpoint(road.coordinates);
        const influences: Influence[] = [];
        corridors.forEach((c, i) => {
          const d = metres(c.latitude, c.longitude, mid[1], mid[0]);
          const named = patterns[i].test(road.name);
          const radius = named ? NAMED_RADIUS_M : FIELD_RADIUS_M;
          if (d >= radius) return;
          const falloff = named ? Math.pow(1 - d / radius, 0.35) : 0.85 * Math.pow(1 - d / radius, 0.9);
          influences.push({ corridor: i, falloff, named });
        });
        return { coordinates: road.coordinates, classFactor: CLASS_FACTOR[road.highway] ?? 0.8, influences, mid };
      }),
  };
}

function roadWeight(road: RoadField["roads"][number], values: number[]): number {
  let w = BASELINE;
  for (const inf of road.influences) w = Math.max(w, values[inf.corridor] * inf.falloff);
  return Math.min(1, w * road.classFactor);
}

/** Road polylines coloured by congestion for one set of corridor values. */
export function congestionRoads(field: RoadField, values: number[], selectedCorridor: number) {
  return field.roads.map((road) => ({
    coordinates: road.coordinates,
    weight: roadWeight(road, values),
    emphasis: road.influences.some((inf) => inf.corridor === selectedCorridor && inf.named),
  }));
}

/** A soft glow under the busier roads. */
export function congestionGlow(field: RoadField, values: number[]) {
  const out: { longitude: number; latitude: number; weight: number }[] = [];
  for (const road of field.roads) {
    const w = roadWeight(road, values);
    if (w > 0.4) out.push({ longitude: road.mid[0], latitude: road.mid[1], weight: (w - 0.3) * 0.6 });
  }
  return out;
}

// --- Route estimates --------------------------------------------------------

/** Congestion felt along a route polyline: mean over its vertices. */
function routeIndex(coords: [number, number][], corridors: CorridorPoint[], values: number[]): number {
  if (coords.length === 0) return BASELINE;
  let sum = 0;
  for (const [lng, lat] of coords) {
    let w = BASELINE;
    corridors.forEach((c, i) => {
      const d = metres(c.latitude, c.longitude, lat, lng);
      if (d < ROUTE_RADIUS_M) w = Math.max(w, values[i] * Math.pow(1 - d / ROUTE_RADIUS_M, 0.6));
    });
    sum += w;
  }
  return sum / coords.length;
}

/** Illustrative speed model for an index — used only for DEMO estimates. */
function speedFor(index: number) {
  return Math.max(8, 34 * (1 - 0.7 * index));
}

export interface RouteEstimate {
  minutes: number;
  usualMinutes: number;
  deltaPct: number;
  trend: number[];
}

export function estimateRoute(
  line: NetworkRouteLine | undefined,
  distanceKm: number,
  corridors: CorridorPoint[],
  grids: number[][][],
  day: number,
  hour: number,
): RouteEstimate {
  const coords = (line?.geometry.coordinates ?? []) as [number, number][];
  const valuesAt = (d: number, h: number) => grids.map((g) => g[d][h]);
  const usualAt = (h: number) => grids.map((g) => g.reduce((s, row) => s + row[h], 0) / g.length);
  const now = routeIndex(coords, corridors, valuesAt(day, hour));
  const usual = routeIndex(coords, corridors, usualAt(hour));
  const minutes = (distanceKm / speedFor(now)) * 60;
  const usualMinutes = (distanceKm / speedFor(usual)) * 60;
  return {
    minutes,
    usualMinutes,
    deltaPct: ((minutes - usualMinutes) / usualMinutes) * 100,
    trend: Array.from({ length: 24 }, (_, h) => routeIndex(coords, corridors, valuesAt(day, h))),
  };
}
