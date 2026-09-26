#!/usr/bin/env node
// Build-time ingestion of the Mumbai-region GTFS feed (all agencies) plus the
// optional OSRM road-snapped BEST geometry into the optimized assets the
// frontend ships. GTFS parsing never happens in the browser.
//
//   node scripts/ingest-gtfs.mjs [--zip <gtfs_compat.zip>] [--osrm <routes.geojson>]
//
// --zip   local copy of the feed; without it the feed is downloaded from
//         https://github.com/croyla/mumbai-gtfs (gtfs_compat.zip).
// --osrm  road-snapped BEST route/direction LineStrings produced by the
//         backend's GTFS → OSRM pipeline. Defaults to
//         data-sources/osrm/mumbai_metropolitan_routes.geojson when present.
//
// Source feed: community-maintained (MIT-0), also listed on the Mobility
// Database as mdb-3138. NOT an official BEST/TMT/KDMT/VVMT publication, and
// it carries NO live vehicle-location data. It has no shapes.txt, so route
// geometry is always derived:
//   road       — OSRM road-snapped path (BEST only), validated here against
//                the trip's real stops; any stop-to-stop leg where OSRM
//                detours absurdly (> REPAIR_EXTRA_M extra and > REPAIR_RATIO×
//                the straight distance) is replaced by a straight connector
//                and counted in the feature's `repaired` property.
//   schematic  — the representative trip's real stops joined in
//                stop_sequence order (agencies/routes without OSRM output).
//
// Outputs
//   public/data/gtfs/routes.geojson     one LineString per route + direction
//   public/data/gtfs/stops.geojson      every stop served by a trip, tiered
//   public/data/gtfs/route-index.json   per-route metadata (search, popups)
//   src/data/gtfs/source.json           provenance, agencies, geometry QA
//   src/data/gtfs/mumbaiBestRoutes.json the three curated demo routes
//   scripts/reports/osrm-route-qa.md    every repaired OSRM leg (for backend)

import { writeFileSync, readFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import readline from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_OUT = join(ROOT, "public", "data", "gtfs");
const SRC_OUT = join(ROOT, "src", "data", "gtfs");
const REPORT_OUT = join(__dirname, "reports");
const DEFAULT_OSRM = join(ROOT, "data-sources", "osrm", "mumbai_metropolitan_routes.geojson");

const GTFS_ZIP_URL = "https://github.com/croyla/mumbai-gtfs/raw/main/gtfs_compat.zip";
const SOURCE_REPOSITORY = "https://github.com/croyla/mumbai-gtfs";
const MOBILITY_DATABASE_FEED_URL = "https://mobilitydatabase.org/feeds/gtfs/mdb-3138";

// Three real BEST routes (short names 9 / 83 / 50) used by the curated demo
// route list (Fleet, RouteDetail). Picked only because they exist as simple
// route_ids in the feed — nothing about them is invented.
const CURATED_ROUTE_IDS = ["9-2", "83-2", "50-2"];

// OSRM leg repair thresholds: a leg between two consecutive stops is treated
// as a routing artefact (wrong-carriageway snap, one-way loop) when the road
// path is BOTH this much longer in absolute terms AND this many times the
// straight stop-to-stop distance. No real bus leg between adjacent stops
// detours 2 km at 3× the distance.
const REPAIR_EXTRA_M = 2000;
const REPAIR_RATIO = 3;

// Douglas–Peucker tolerance for road geometry (metres). Well under a lane
// width at map zooms; cuts OSRM's dense vertex output by most of its size.
const SIMPLIFY_M = 8;

// --- CLI -----------------------------------------------------------------

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// --- CSV parsing ---------------------------------------------------------

function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      fields.push(cur);
      cur = "";
    } else cur += c;
  }
  fields.push(cur);
  return fields;
}

/** Small GTFS files: read whole, one object per row. */
function readCsv(filePath) {
  const lines = readFileSync(filePath, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const row = parseCsvLine(line);
    const obj = {};
    header.forEach((key, i) => (obj[key] = row[i]));
    return obj;
  });
}

/** stop_times.txt (2.6M rows): streamed, handler gets the raw field array. */
async function streamCsv(filePath, onRow) {
  const rl = readline.createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    if (line.length === 0) continue;
    const row = parseCsvLine(line);
    if (!header) {
      header = Object.fromEntries(row.map((h, i) => [h.replace(/^﻿/, "").trim(), i]));
      continue;
    }
    onRow(row, header);
  }
}

// --- Feed acquisition ----------------------------------------------------

async function extractFeed(localZip) {
  const workDir = mkdtempSync(join(tmpdir(), "mumbai-gtfs-"));
  let zipPath = localZip ? resolve(localZip) : join(workDir, "gtfs_compat.zip");
  if (!localZip) {
    console.log(`Downloading ${GTFS_ZIP_URL} ...`);
    const res = await fetch(GTFS_ZIP_URL);
    if (!res.ok) throw new Error(`Failed to fetch ${GTFS_ZIP_URL}: ${res.status} ${res.statusText}`);
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  }
  const extractDir = join(workDir, "extracted");
  console.log(`Extracting ${zipPath} ...`);
  try {
    execFileSync("unzip", ["-oq", zipPath, "-d", extractDir]);
  } catch {
    execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`]);
  }
  return { workDir, extractDir, zipPath };
}

// --- Geometry helpers ----------------------------------------------------

const RAD = Math.PI / 180;
function haversineM(a, b) {
  const dLat = (b[1] - a[1]) * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
const lengthM = (coords) => coords.slice(1).reduce((s, c, i) => s + haversineM(coords[i], c), 0);
const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

/** Cumulative along-line distance (m) at each vertex. */
function cumulative(line) {
  const c = [0];
  for (let i = 1; i < line.length; i++) c.push(c[i - 1] + haversineM(line[i - 1], line[i]));
  return c;
}

/** Nearest point on `line` to `p`, searching segments from `fromIdx` on so a
 * trip's stops project in travel order. */
function project(p, line, cum, fromIdx) {
  const kx = 111320 * Math.cos(p[1] * RAD);
  const ky = 110540;
  let best = { d: Infinity, idx: fromIdx, t: 0 };
  for (let i = fromIdx; i < line.length - 1; i++) {
    const ax = (line[i][0] - p[0]) * kx, ay = (line[i][1] - p[1]) * ky;
    const bx = (line[i + 1][0] - p[0]) * kx, by = (line[i + 1][1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best.d - 0.5) best = { d, idx: i, t };
  }
  const a = line[best.idx], b = line[Math.min(best.idx + 1, line.length - 1)];
  return {
    ...best,
    along: cum[best.idx] + best.t * (cum[Math.min(best.idx + 1, line.length - 1)] - cum[best.idx]),
    point: [a[0] + best.t * (b[0] - a[0]), a[1] + best.t * (b[1] - a[1])],
  };
}

/** Iterative Douglas–Peucker in a local metric frame. */
function simplify(coords, tolM) {
  if (coords.length <= 2) return coords;
  const lat0 = coords[0][1] * RAD;
  const kx = 111320 * Math.cos(lat0), ky = 110540;
  const pts = coords.map(([x, y]) => [x * kx, y * ky]);
  const keep = new Uint8Array(coords.length);
  keep[0] = keep[coords.length - 1] = 1;
  const stack = [[0, coords.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    const [ax, ay] = pts[s], [bx, by] = pts[e];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = L ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L : Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tolM && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return coords.filter((_, i) => keep[i]);
}

/** Validate an OSRM line against its trip's stops; splice straight
 * connectors over detour legs. Returns the repaired line + the legs fixed. */
function repairOsrmLine(line, stopCoords, stopNames) {
  const cum = cumulative(line);
  let from = 0;
  const proj = stopCoords.map((c) => {
    const p = project(c, line, cum, from);
    from = p.idx;
    return p;
  });
  const bad = [];
  for (let i = 0; i < proj.length - 1; i++) {
    const road = proj[i + 1].along - proj[i].along;
    const straight = haversineM(stopCoords[i], stopCoords[i + 1]);
    if (straight > 0 && road - straight > REPAIR_EXTRA_M && road / straight > REPAIR_RATIO) {
      bad.push({ i, from: stopNames[i], to: stopNames[i + 1], straightKm: round(straight / 1000, 2), roadKm: round(road / 1000, 2) });
    }
  }
  const maxStopOffsetM = Math.max(...proj.map((p) => p.d));
  if (bad.length === 0) return { coords: line, repaired: [], maxStopOffsetM };

  const out = [];
  let cursor = 0; // next vertex index of `line` not yet emitted
  for (const leg of bad) {
    const a = proj[leg.i], b = proj[leg.i + 1];
    for (let k = cursor; k <= a.idx; k++) out.push(line[k]);
    out.push(a.point, b.point); // straight connector replaces the loop
    cursor = b.idx + 1;
  }
  for (let k = cursor; k < line.length; k++) out.push(line[k]);
  return { coords: out, repaired: bad, maxStopOffsetM };
}

// --- Main ----------------------------------------------------------------

async function main() {
  const osrmPath = arg("--osrm") ? resolve(arg("--osrm")) : existsSync(DEFAULT_OSRM) ? DEFAULT_OSRM : null;
  const { workDir, extractDir, zipPath } = await extractFeed(arg("--zip"));
  try {
    const hasShapes = existsSync(join(extractDir, "shapes.txt"));
    if (hasShapes) console.warn("shapes.txt IS present — update this script to prefer it over derived geometry.");

    const read = (name) => readCsv(join(extractDir, name));
    const agencies = read("agency.txt");
    const feedInfo = read("feed_info.txt")[0];
    const routes = read("routes.txt");
    const allStops = read("stops.txt");
    const trips = read("trips.txt");
    console.log(`Feed: ${agencies.length} agencies, ${routes.length} routes, ${trips.length} trips, ${allStops.length} stops.`);

    const routeById = new Map(routes.map((r) => [r.route_id, r]));
    const tripById = new Map(trips.map((t) => [t.trip_id, t]));
    const tripCountByRoute = new Map();
    for (const t of trips) tripCountByRoute.set(t.route_id, (tripCountByRoute.get(t.route_id) ?? 0) + 1);
    const stopById = new Map(allStops.map((s) => [s.stop_id, s]));
    const stopCoord = (id) => {
      const s = stopById.get(id);
      return s ? [Number(s.stop_lon), Number(s.stop_lat)] : null;
    };

    // OSRM input (BEST route/direction lines), keyed "route_id|direction".
    const osrmByKey = new Map();
    if (osrmPath) {
      const osrm = JSON.parse(readFileSync(osrmPath, "utf8"));
      for (const f of osrm.features) {
        const p = f.properties;
        const route = routeById.get(p.route_id);
        const trip = tripById.get(p.trip_id);
        // Only accept features whose ids check out against the feed.
        if (!route || !trip || trip.route_id !== p.route_id || f.geometry?.type !== "LineString") {
          console.warn(`Skipping OSRM feature ${p.route_id}/${p.direction_id}: ids do not match the GTFS feed.`);
          continue;
        }
        osrmByKey.set(`${p.route_id}|${p.direction_id}`, { tripId: p.trip_id, coords: f.geometry.coordinates });
      }
      console.log(`OSRM: ${osrmByKey.size} validated route/direction lines from ${osrmPath}`);
    }

    // Pass 1 — stop_times: per-trip row counts, and which routes serve each stop.
    console.log("Pass 1/2 over stop_times.txt ...");
    const tripStopCount = new Map();
    const routesByStop = new Map();
    await streamCsv(join(extractDir, "stop_times.txt"), (row, h) => {
      const tripId = row[h.trip_id];
      tripStopCount.set(tripId, (tripStopCount.get(tripId) ?? 0) + 1);
      const routeId = tripById.get(tripId)?.route_id;
      if (!routeId) return;
      const stopId = row[h.stop_id];
      let set = routesByStop.get(stopId);
      if (!set) routesByStop.set(stopId, (set = new Set()));
      set.add(routeId);
    });

    // Representative trip per route+direction: the OSRM one where present
    // (so validation uses the same stops OSRM routed through), else the
    // trip with the most stops.
    const repByKey = new Map();
    for (const [tripId, count] of tripStopCount) {
      const t = tripById.get(tripId);
      if (!t) continue;
      const key = `${t.route_id}|${t.direction_id || "0"}`;
      const cur = repByKey.get(key);
      if (!cur || count > cur.count) repByKey.set(key, { tripId, count });
    }
    for (const [key, o] of osrmByKey) repByKey.set(key, { tripId: o.tripId, count: tripStopCount.get(o.tripId) ?? 0 });
    const wanted = new Set([...repByKey.values()].map((v) => v.tripId));

    console.log(`Pass 2/2 over stop_times.txt: stop sequences for ${wanted.size} representative trips ...`);
    const seqByTrip = new Map();
    await streamCsv(join(extractDir, "stop_times.txt"), (row, h) => {
      const tripId = row[h.trip_id];
      if (!wanted.has(tripId)) return;
      let arr = seqByTrip.get(tripId);
      if (!arr) seqByTrip.set(tripId, (arr = []));
      arr.push([Number(row[h.stop_sequence]), row[h.stop_id]]);
    });
    for (const arr of seqByTrip.values()) arr.sort((a, b) => a[0] - b[0]);

    // --- Route geometry ---------------------------------------------------
    const features = [];
    const qa = [];
    let roadCount = 0, schematicCount = 0, repairedLegs = 0, pointsIn = 0, pointsOut = 0;
    const lengthsByRoute = new Map();
    for (const [key, { tripId }] of repByKey) {
      const [routeId, dir] = key.split("|");
      const route = routeById.get(routeId);
      if (!route) continue;
      const seq = (seqByTrip.get(tripId) ?? []).map(([, id]) => id).filter((id) => stopById.has(id));
      const stopCoords = seq.map(stopCoord);
      if (stopCoords.length < 2) continue;

      let coords, geometry, repaired = 0;
      const osrm = osrmByKey.get(key);
      if (osrm) {
        const fix = repairOsrmLine(osrm.coords, stopCoords, seq.map((id) => stopById.get(id).stop_name));
        repaired = fix.repaired.length;
        repairedLegs += repaired;
        if (repaired) qa.push({ routeId, shortName: route.route_short_name, dir, legs: fix.repaired });
        pointsIn += osrm.coords.length;
        coords = simplify(fix.coords, SIMPLIFY_M);
        pointsOut += coords.length;
        geometry = "road";
        roadCount++;
      } else {
        coords = stopCoords;
        geometry = "schematic";
        schematicCount++;
      }
      coords = coords.map(([x, y]) => [round(x, 5), round(y, 5)]).filter((c, i, a) => i === 0 || c[0] !== a[i - 1][0] || c[1] !== a[i - 1][1]);
      const distanceKm = round(lengthM(coords) / 1000, 1);
      lengthsByRoute.set(routeId, Math.max(lengthsByRoute.get(routeId) ?? 0, distanceKm));
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {
          id: key,
          routeId,
          agencyId: route.agency_id,
          shortName: route.route_short_name,
          longName: route.route_long_name,
          directionId: Number(dir),
          stopCount: seq.length,
          // Real terminals of this direction's representative trip.
          from: stopById.get(seq[0]).stop_name,
          to: stopById.get(seq[seq.length - 1]).stop_name,
          distanceKm,
          geometry,
          repaired,
        },
      });
    }
    // Draw long trunk routes first so short feeders stay visible on top.
    features.sort((a, b) => b.properties.distanceKm - a.properties.distanceKm);
    console.log(`Route lines: ${roadCount} road-snapped (${repairedLegs} legs repaired), ${schematicCount} schematic. OSRM vertices ${pointsIn} → ${pointsOut}.`);

    // --- Stops ------------------------------------------------------------
    // Tier from how many routes serve the stop: 1 = interchange hubs (shown
    // city-wide), 2 = busy stops (mid zoom), 3 = everything else (close in).
    const servedStops = allStops.filter((s) => routesByStop.has(s.stop_id));
    const routeCounts = servedStops.map((s) => routesByStop.get(s.stop_id).size).sort((a, b) => b - a);
    const tier1Min = Math.max(8, routeCounts[Math.floor(routeCounts.length * 0.04)]);
    const tier2Min = Math.max(3, routeCounts[Math.floor(routeCounts.length * 0.25)]);
    const stopFeatures = servedStops.map((s) => {
      const served = routesByStop.get(s.stop_id);
      const agencyIds = [...new Set([...served].map((r) => routeById.get(r)?.agency_id).filter(Boolean))].sort();
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [Number(s.stop_lon), Number(s.stop_lat)] },
        properties: {
          id: s.stop_id,
          name: s.stop_name,
          agencies: agencyIds.join(","),
          routes: served.size,
          tier: served.size >= tier1Min ? 1 : served.size >= tier2Min ? 2 : 3,
        },
      };
    });
    const tierCounts = [1, 2, 3].map((t) => stopFeatures.filter((f) => f.properties.tier === t).length);
    console.log(`Stops: ${stopFeatures.length} served (of ${allStops.length}); tiers ${tierCounts.join(" / ")} (hub ≥ ${tier1Min} routes, busy ≥ ${tier2Min}).`);

    // --- Route index -------------------------------------------------------
    const stopsServedByRoute = new Map();
    for (const [stopId, set] of routesByStop) for (const r of set) {
      let s = stopsServedByRoute.get(r);
      if (!s) stopsServedByRoute.set(r, (s = new Set()));
      s.add(stopId);
    }
    const geometryByRoute = new Map();
    for (const f of features) {
      const p = f.properties;
      const cur = geometryByRoute.get(p.routeId) ?? { directions: 0, geometry: p.geometry, bbox: [180, 90, -180, -90] };
      cur.directions++;
      if (p.geometry === "schematic") cur.geometry = "schematic";
      for (const [x, y] of f.geometry.coordinates) {
        cur.bbox = [Math.min(cur.bbox[0], x), Math.min(cur.bbox[1], y), Math.max(cur.bbox[2], x), Math.max(cur.bbox[3], y)];
      }
      geometryByRoute.set(p.routeId, cur);
    }
    const routeIndex = routes
      .map((r) => {
        const g = geometryByRoute.get(r.route_id);
        return {
          routeId: r.route_id,
          agencyId: r.agency_id,
          shortName: r.route_short_name,
          longName: r.route_long_name,
          tripCount: tripCountByRoute.get(r.route_id) ?? 0,
          stopsServed: stopsServedByRoute.get(r.route_id)?.size ?? 0,
          directions: g?.directions ?? 0,
          geometry: g?.geometry ?? null,
          distanceKm: lengthsByRoute.get(r.route_id) ?? null,
          bbox: g ? g.bbox.map((n) => round(n, 4)) : null,
        };
      })
      .sort((a, b) => a.agencyId.localeCompare(b.agencyId) || a.shortName.localeCompare(b.shortName, "en", { numeric: true }));

    // --- Curated demo routes (unchanged contract) --------------------------
    const curatedRoutes = CURATED_ROUTE_IDS.map((routeId) => {
      const route = routeById.get(routeId);
      if (!route) throw new Error(`Curated route_id ${routeId} not found in the feed`);
      const candidates = [...repByKey.entries()].filter(([k]) => k.startsWith(`${routeId}|`));
      const lines = candidates.map(([, v]) => (seqByTrip.get(v.tripId) ?? []).map(([, id]) => stopCoord(id)).filter(Boolean));
      const line = lines.sort((a, b) => lengthM(b) - lengthM(a))[0];
      if (!line || line.length < 2) throw new Error(`No stop sequence for curated route ${routeId}`);
      const [originName, destinationName] = route.route_long_name.split("⇆").map((s) => s.trim());
      return {
        gtfsRouteId: route.route_id,
        shortName: route.route_short_name,
        longName: route.route_long_name,
        origin: { stopId: "", name: originName ?? route.route_long_name, latitude: round(line[0][1], 6), longitude: round(line[0][0], 6) },
        destination: { stopId: "", name: destinationName ?? route.route_long_name, latitude: round(line.at(-1)[1], 6), longitude: round(line.at(-1)[0], 6) },
        approxDistanceKm: round(lengthM(line) / 1000, 1),
        scheduledTripCount: tripCountByRoute.get(routeId) ?? 0,
      };
    });

    // --- Provenance ---------------------------------------------------------
    const fmtDate = (d) => (d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null);
    const serviceStartDate = fmtDate(feedInfo?.feed_start_date);
    const serviceEndDate = fmtDate(feedInfo?.feed_end_date);
    const today = new Date().toISOString().slice(0, 10);
    const agencyStats = agencies.map((a) => ({
      agencyId: a.agency_id,
      name: a.agency_name,
      url: a.agency_url || null,
      routes: routes.filter((r) => r.agency_id === a.agency_id).length,
      trips: trips.filter((t) => routeById.get(t.route_id)?.agency_id === a.agency_id).length,
      stops: stopFeatures.filter((f) => f.properties.agencies.split(",").includes(a.agency_id)).length,
      roadGeometry: features.filter((f) => f.properties.agencyId === a.agency_id && f.properties.geometry === "road").length,
      schematicGeometry: features.filter((f) => f.properties.agencyId === a.agency_id && f.properties.geometry === "schematic").length,
    }));
    const source = {
      datasetName: "mumbai-gtfs community feed (gtfs_compat)",
      repository: SOURCE_REPOSITORY,
      mobilityDatabaseFeedUrl: MOBILITY_DATABASE_FEED_URL,
      license: "MIT-0",
      feedPublisher: feedInfo?.feed_publisher_name ?? null,
      feedFile: zipPath.split(/[\\/]/).pop(),
      filesUsed: ["agency.txt", "feed_info.txt", "calendar.txt", "routes.txt", "stops.txt", "trips.txt", "stop_times.txt"],
      generatedAt: new Date().toISOString(),
      serviceStartDate,
      serviceEndDate,
      isCurrent: Boolean(serviceStartDate && serviceEndDate && serviceStartDate <= today && today <= serviceEndDate),
      hasShapes,
      agencies: agencyStats,
      totals: { routes: routes.length, trips: trips.length, stops: stopFeatures.length, routeLines: features.length },
      geometry: {
        road: roadCount,
        schematic: schematicCount,
        osrmFile: osrmPath ? osrmPath.split(/[\\/]/).pop() : null,
        osrmRepairedLegs: repairedLegs,
        osrmRouteLinesRepaired: qa.length,
        repairRule: `leg > ${REPAIR_EXTRA_M / 1000} km longer and > ${REPAIR_RATIO}× the straight distance between consecutive stops`,
        simplifyToleranceM: SIMPLIFY_M,
      },
      stopTiers: { hubMinRoutes: tier1Min, busyMinRoutes: tier2Min, counts: tierCounts },
      notes:
        "Community-maintained GTFS for Mumbai-region operators (BEST, TMT, KDMT, VVMT). Not an official publication by any " +
        "transit authority and it carries NO live vehicle-location data — every bus position in Fleet Drishti is simulated " +
        "or demo. No shapes.txt: BEST route lines are road-snapped by an OSRM pipeline and validated against the trip's real " +
        "stops (detour legs replaced by straight connectors); other operators' lines join the trip's real stops in " +
        "stop_sequence order (schematic). Neither is official route geometry.",
      curatedRouteIds: CURATED_ROUTE_IDS,
    };

    mkdirSync(PUBLIC_OUT, { recursive: true });
    mkdirSync(REPORT_OUT, { recursive: true });
    writeFileSync(join(PUBLIC_OUT, "routes.geojson"), JSON.stringify({ type: "FeatureCollection", features }));
    writeFileSync(join(PUBLIC_OUT, "stops.geojson"), JSON.stringify({ type: "FeatureCollection", features: stopFeatures }));
    writeFileSync(join(PUBLIC_OUT, "route-index.json"), JSON.stringify(routeIndex));
    writeFileSync(join(SRC_OUT, "source.json"), JSON.stringify(source, null, 2));
    writeFileSync(join(SRC_OUT, "mumbaiBestRoutes.json"), JSON.stringify(curatedRoutes, null, 2));

    // QA report for the OSRM pipeline owner.
    const md = [
      "# OSRM route geometry QA",
      "",
      `Generated ${source.generatedAt} by scripts/ingest-gtfs.mjs from \`${source.geometry.osrmFile ?? "(no OSRM file)"}\`.`,
      "",
      `- Road-snapped route/direction lines: **${roadCount}**`,
      `- Lines needing repair: **${qa.length}** (${repairedLegs} stop-to-stop legs)`,
      `- Rule: ${source.geometry.repairRule}. The detour is replaced by a straight connector in the app.`,
      `- BEST routes with no geometry are routes with zero trips in the feed (nothing to draw).`,
      "",
      "Likely causes: stop snapped to the wrong carriageway / flyover level, or the OSRM car profile forbidding a turn or",
      "one-way movement that buses make. Fixing these in the pipeline (bus profile, snapping radius, or per-stop bearing",
      "hints) will make the repairs unnecessary — re-run this script with the new file.",
      "",
      "| Route | Dir | From stop | To stop | Straight km | OSRM km |",
      "|---|---|---|---|---|---|",
      ...qa
        .flatMap((r) => r.legs.map((l) => ({ ...l, r })))
        .sort((a, b) => b.roadKm - b.straightKm - (a.roadKm - a.straightKm))
        .map((l) => `| ${l.r.shortName} (${l.r.routeId}) | ${l.r.dir} | ${l.from} | ${l.to} | ${l.straightKm} | ${l.roadKm} |`),
      "",
    ].join("\n");
    writeFileSync(join(REPORT_OUT, "osrm-route-qa.md"), md);

    console.log(`Wrote ${features.length} route lines, ${stopFeatures.length} stops, ${routeIndex.length} indexed routes → ${PUBLIC_OUT}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
