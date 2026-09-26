import type { DemoSensingBus, NetworkRouteLine, TransitStop } from "../../types";

// Deterministic DEMO sensing buses spread over the real GTFS network, so the
// maps read as a fleet rather than seven isolated fixture markers.
//
// Nothing here is random: route choice, position along the line, status and
// camera count all come from a string hash of the route id, so the same
// buses appear in the same places on every load. The positions are
// illustrative — not GPS — and every consumer labels them DEMO.

// Buses per operator, roughly in proportion to each operator's scheduled
// service in the feed (BEST dominates; KDMT has very few trips).
const QUOTA: Record<string, number> = { BEST: 30, TMT: 9, VVMT: 4, KDMT: 2 };
const MIN_ROUTE_KM = 4;
// Keep demo buses from stacking on the same junction.
const MIN_SPACING_M = 900;
const NEAR_STOP_M = 500;

// FNV-1a, 32-bit.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const RAD = Math.PI / 180;
function metres(a: [number, number], b: [number, number]): number {
  const kx = 111_320 * Math.cos(a[1] * RAD);
  return Math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * 110_540);
}

/** Point `fraction` (0..1) of the way along a LineString. */
function pointAlong(coords: [number, number][], fraction: number): [number, number] {
  const seg = coords.slice(1).map((c, i) => metres(coords[i], c));
  const total = seg.reduce((s, d) => s + d, 0);
  let target = total * fraction;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i]) {
      const t = seg[i] ? target / seg[i] : 0;
      const [a, b] = [coords[i], coords[i + 1]];
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    }
    target -= seg[i];
  }
  return coords[coords.length - 1];
}

export function buildDemoSensingFleet(lines: NetworkRouteLine[], stops: TransitStop[]): DemoSensingBus[] {
  const placed: DemoSensingBus[] = [];
  const agencies = Object.keys(QUOTA);

  for (const agencyId of agencies) {
    // Candidate lines: this operator, long enough to be a real service, and
    // for road-snapped lines only those with no repaired legs (so a demo bus
    // never sits on a straight repair connector). One direction per route.
    const seen = new Set<string>();
    const candidates = lines
      .filter(
        (l) =>
          l.agencyId === agencyId &&
          l.distanceKm >= MIN_ROUTE_KM &&
          l.geometry.coordinates.length >= 2 &&
          (l.geometryType !== "road_snapped" || l.repairedLegs === 0),
      )
      .sort((a, b) => hash(`${a.gtfsRouteId}|${a.directionId}`) - hash(`${b.gtfsRouteId}|${b.directionId}`))
      .filter((l) => (seen.has(l.gtfsRouteId) ? false : (seen.add(l.gtfsRouteId), true)));

    let count = 0;
    for (const line of candidates) {
      if (count >= QUOTA[agencyId]) break;
      const h = hash(`${line.gtfsRouteId}|${line.directionId}|pos`);
      const fraction = 0.15 + (h % 70) / 100; // 15–84% along the route
      const position = pointAlong(line.geometry.coordinates, fraction);
      if (placed.some((b) => metres([b.longitude, b.latitude], position) < MIN_SPACING_M)) continue;

      let nearStop: TransitStop | null = null;
      let nearD = NEAR_STOP_M;
      for (const s of stops) {
        const d = metres(position, [s.longitude, s.latitude]);
        if (d < nearD) {
          nearD = d;
          nearStop = s;
        }
      }

      count++;
      const cameraCount = 1 + (h % 3);
      placed.push({
        busId: `FD-${agencyId}-${String(count).padStart(2, "0")}`,
        agencyId,
        gtfsRouteId: line.gtfsRouteId,
        routeShortName: line.shortName,
        routeLongName: line.longName,
        directionId: line.directionId,
        fromStop: line.fromStop,
        toStop: line.toStop,
        status: h % 7 === 0 ? "idle" : "active",
        cameraCount,
        camerasOnline: h % 11 === 0 && cameraCount > 1 ? cameraCount - 1 : cameraCount,
        latitude: Math.round(position[1] * 1e5) / 1e5,
        longitude: Math.round(position[0] * 1e5) / 1e5,
        nearStopName: nearStop?.name ?? null,
        positionSource: "DEMO",
      });
    }
  }
  return placed;
}
