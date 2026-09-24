#!/usr/bin/env node
// One-time (re-run manually when needed) extraction of real major-road
// geometry across Mumbai (island city + western and eastern suburbs), from
// OpenStreetMap via the Overpass API, into a static JSON asset the Traffic
// page ships. Not run at request time or in the browser. Re-run with:
//   node scripts/fetch-corridor-roads.mjs
// or, to reuse a saved Overpass response:
//   node scripts/fetch-corridor-roads.mjs path/to/overpass.json
//
// Only the *geometry* is real (OSM, ODbL — attribution is already on every
// map). The congestion drawn on these roads on the Traffic page is the DEMO
// day × hour model until real bus-derived traffic observations exist.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data", "traffic");
const ENDPOINTS = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"];
// south, west, north, east
const BBOX = [18.89, 72.78, 19.28, 73.0];
const HIGHWAY = "^(motorway|motorway_link|trunk|trunk_link|primary|secondary)$";
const SIMPLIFY_M = 10;

// Keep Greater Mumbai; drop Navi Mumbai, Thane and Mira-Bhayandar, which the
// bounding box clips into.
function inMumbai([lng, lat]) {
  if (lat > 19.265) return false;
  if (lng > 72.975) return false;
  if (lat > 19.19 && lng > 72.95) return false;
  if (lat < 19.16 && lng > 72.965) return false;
  return true;
}

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

async function fetchWays() {
  const query = `[out:json][timeout:120];way(${BBOX.join(",")})["highway"~"${HIGHWAY}"];out geom;`;
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
      lastError = new Error(`Overpass ${res.status} from ${endpoint}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  throw lastError;
}

const cached = process.argv[2];
const elements = cached ? JSON.parse(readFileSync(cached, "utf8")).elements : await fetchWays();

const ways = [];
for (const el of elements) {
  if (el.type !== "way" || !el.geometry) continue;
  const raw = el.geometry.map((g) => [g.lon, g.lat]);
  if (!inMumbai(raw[Math.floor(raw.length / 2)])) continue;
  const coords = simplify(raw, SIMPLIFY_M).map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);
  if (coords.length < 2) continue;
  const road = { id: el.id, highway: el.tags?.highway ?? "", name: el.tags?.name ?? "", coordinates: coords };
  if (el.tags?.ref) road.ref = el.tags.ref;
  if (el.tags?.oneway === "yes") road.oneway = true;
  ways.push(road);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "mumbaiRoads.json"), JSON.stringify(ways));
writeFileSync(
  join(OUT_DIR, "source.json"),
  JSON.stringify(
    {
      dataset: "OpenStreetMap major roads across Greater Mumbai",
      license: "ODbL 1.0 — © OpenStreetMap contributors",
      endpoints: ENDPOINTS,
      bbox: BBOX,
      highwayFilter: HIGHWAY,
      wayCount: ways.length,
      retrievedAt: new Date().toISOString(),
      note: "Geometry only. Congestion drawn on it is DEMO data until real bus-derived observations exist.",
    },
    null,
    2,
  ),
);
console.log(`Wrote ${ways.length} ways`);
