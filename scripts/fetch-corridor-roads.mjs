#!/usr/bin/env node
// One-time (re-run manually when needed) extraction of real major-road
// geometry around each monitored traffic corridor, from OpenStreetMap via the
// Overpass API, into a static JSON asset the Traffic page ships. Not run at
// request time or in the browser. Re-run with:
//   node scripts/fetch-corridor-roads.mjs
//
// Only the *geometry* is real (OSM, ODbL — attribution is already on every
// map). The congestion drawn on these roads on the Traffic page is the DEMO
// day × hour pattern until real bus-derived traffic observations exist.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data", "traffic");
const ENDPOINTS = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"];
const RADIUS_M = 3500;
const HIGHWAY = "^(motorway|motorway_link|trunk|trunk_link|primary|secondary)$";
const SIMPLIFY_M = 6;

// Corridor locations come straight from the traffic fixture.
const fixture = readFileSync(join(__dirname, "..", "src", "data", "mock", "traffic.ts"), "utf8");
const corridors = [...fixture.matchAll(/hotspotId: "([^"]+)"[\s\S]*?latitude: ([\d.]+),\s*longitude: ([\d.]+)/g)].map((m) => ({
  hotspotId: m[1],
  lat: Number(m[2]),
  lng: Number(m[3]),
}));
if (corridors.length === 0) throw new Error("No corridors parsed from src/data/mock/traffic.ts");

function metres(a, b) {
  const kx = 111_320 * Math.cos((a[1] * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * 110_540);
}

// Douglas–Peucker in local metres.
function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0;
    let idx = -1;
    const a = points[s];
    const b = points[e];
    const ab = metres(a, b) || 1e-9;
    for (let i = s + 1; i < e; i++) {
      const d = (metres(a, points[i]) + metres(points[i], b) - ab) * 0.5; // cheap proxy for perpendicular distance
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

async function fetchCorridor(c) {
  const query = `[out:json][timeout:90];way(around:${RADIUS_M},${c.lat},${c.lng})["highway"~"${HIGHWAY}"];out geom;`;
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "FleetDrishti-dev/0.1" },
        body: new URLSearchParams({ data: query }),
      });
      if (res.ok) return (await res.json()).elements;
      lastError = new Error(`Overpass ${res.status} from ${endpoint} for ${c.hotspotId}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  throw lastError;
}

const ways = new Map();
for (const c of corridors) {
  const elements = await fetchCorridor(c);
  for (const el of elements) {
    if (el.type !== "way" || !el.geometry || ways.has(el.id)) continue;
    const coords = simplify(
      el.geometry.map((g) => [g.lon, g.lat]),
      SIMPLIFY_M,
    ).map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);
    ways.set(el.id, { id: el.id, highway: el.tags?.highway ?? "", name: el.tags?.name ?? "", coordinates: coords });
  }
  console.log(`${c.hotspotId}: ${elements.length} ways`);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "corridorRoads.json"), JSON.stringify([...ways.values()]));
writeFileSync(
  join(OUT_DIR, "source.json"),
  JSON.stringify(
    {
      dataset: "OpenStreetMap major roads around monitored traffic corridors",
      license: "ODbL 1.0 — © OpenStreetMap contributors",
      endpoints: ENDPOINTS,
      radiusMetres: RADIUS_M,
      highwayFilter: HIGHWAY,
      corridors: corridors.map((c) => c.hotspotId),
      wayCount: ways.size,
      retrievedAt: new Date().toISOString(),
      note: "Geometry only. Congestion drawn on it is DEMO data until real bus-derived observations exist.",
    },
    null,
    2,
  ),
);
console.log(`Wrote ${ways.size} ways`);
