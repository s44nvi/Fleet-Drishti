#!/usr/bin/env node
// One-time (re-run manually when needed) ingestion of the public mumbai-gtfs
// community feed's BEST slice into static JSON assets the frontend ships.
// This is NOT run at request time and NOT run in the browser — GTFS parsing
// stays out of React entirely. Re-run with:
//   node scripts/ingest-gtfs.mjs
//
// Source: https://github.com/croyla/mumbai-gtfs (gtfs_compat.zip — the
// "compat" variant merges each route's directional (Up)/(Down) name
// suffixes into a single title-cased long_name; gtfs.zip is the same data
// with those suffixes kept separate). Also listed on the Mobility Database:
// https://mobilitydatabase.org/feeds/gtfs/mdb-3138
//
// This feed covers four Mumbai-region operators (BEST, KDMT, TMT, VVMT) —
// this script filters to BEST ONLY, per this project's current scope. It is
// a community-maintained (MIT-0 licensed) feed, not an official publication
// by BEST or any transit authority, and it carries no live vehicle-location
// data — see src/data/gtfs/source.json (written below) for full provenance.
// It has no shapes.txt (no official route geometry), so route lines here
// remain a real, derived stop-sequence approximation, same as before.

import { writeFileSync, readFileSync, mkdtempSync, rmSync, existsSync, createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import readline from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data", "gtfs");

const GTFS_ZIP_URL = "https://github.com/croyla/mumbai-gtfs/raw/main/gtfs_compat.zip";
const SOURCE_REPOSITORY = "https://github.com/croyla/mumbai-gtfs";
const MOBILITY_DATABASE_FEED_URL = "https://mobilitydatabase.org/feeds/gtfs/mdb-3138";

// Three real, verifiable BEST routes (short names 9 / 83 / 50) used for the
// "curated route" demo list (src/pages/Fleet, RouteDetail). Picked only
// because they exist as single, simple route_ids in the verified feed —
// nothing about these three is invented.
const CURATED_ROUTE_IDS = ["9-2", "83-2", "50-2"];

// --- CSV parsing --------------------------------------------------------

// Minimal RFC4180 CSV parser (handles quoted fields, embedded commas/quotes)
// — small enough to inline rather than pull in a CSV dependency for a
// one-time build script. Used for the small GTFS files only (routes, stops,
// trips, agency, calendar, feed_info) — stop_times.txt (2.6M rows across all
// four agencies) is streamed line-by-line instead, see readCsvStream below.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const header = rows[0];
  return rows.slice(1).filter((r) => r.length === header.length && r.some((v) => v !== "")).map((r) => {
    const obj = {};
    header.forEach((key, idx) => (obj[key.trim()] = r[idx]));
    return obj;
  });
}

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

/** Streams a (potentially huge) CSV file line-by-line so it never has to sit
 * fully in memory as a single string or a full array of row objects — only
 * stop_times.txt in this feed (140MB, 2.6M rows, all four agencies) needs
 * this; every other file is small enough for parseCsv() above. */
async function readCsvStream(filePath, onRow) {
  const rl = readline.createInterface({ input: createReadStream(filePath, { encoding: "utf8" }), crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    if (line.length === 0) continue;
    const row = parseCsvLine(line);
    if (!header) {
      header = row;
      continue;
    }
    const obj = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = row[i];
    onRow(obj);
  }
}

// --- Download + extract --------------------------------------------------

async function downloadAndExtractGtfs() {
  const workDir = mkdtempSync(join(tmpdir(), "mumbai-gtfs-"));
  const zipPath = join(workDir, "gtfs_compat.zip");
  console.log(`Downloading ${GTFS_ZIP_URL} ...`);
  const res = await fetch(GTFS_ZIP_URL);
  if (!res.ok) throw new Error(`Failed to fetch ${GTFS_ZIP_URL}: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(zipPath, buf);

  const extractDir = join(workDir, "extracted");
  console.log(`Extracting to ${extractDir} ...`);
  try {
    // `unzip` (Info-ZIP) — available on Linux/macOS and Git Bash on Windows.
    execFileSync("unzip", ["-oq", zipPath, "-d", extractDir]);
  } catch {
    // Fall back to Windows PowerShell's Expand-Archive.
    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`,
    ]);
  }
  return { workDir, extractDir };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Six decimal places (~11cm) is already far finer than this feed's real
// positional accuracy — trimming keeps shipped assets smaller without
// discarding any meaningful precision.
const round6 = (n) => Math.round(n * 1e6) / 1e6;

async function main() {
  const { workDir, extractDir } = await downloadAndExtractGtfs();
  try {
    if (existsSync(join(extractDir, "shapes.txt"))) {
      console.warn("shapes.txt IS present in this feed — this script should be updated to use it instead of stop-sequence approximation.");
    }

    console.log("Parsing agency.txt / feed_info.txt / calendar.txt / routes.txt / stops.txt / trips.txt ...");
    const readFile = (name) => parseCsv(readFileSync(join(extractDir, name), "utf8"));
    const agency = readFile("agency.txt");
    const feedInfo = readFile("feed_info.txt");
    const calendar = readFile("calendar.txt");
    const allRoutes = readFile("routes.txt");
    const allStops = readFile("stops.txt");
    const allTrips = readFile("trips.txt");

    const bestAgency = agency.find((a) => a.agency_id === "BEST");
    if (!bestAgency) throw new Error("BEST agency not found in agency.txt");

    // --- BEST-only scope: filter routes/trips before touching stop_times ---
    const routes = allRoutes.filter((r) => r.agency_id === "BEST");
    const routeIds = new Set(routes.map((r) => r.route_id));
    const trips = allTrips.filter((t) => routeIds.has(t.route_id));
    const tripIds = new Set(trips.map((t) => t.trip_id));
    console.log(`BEST scope: ${routes.length} routes, ${trips.length} trips (out of ${allRoutes.length} routes / ${allTrips.length} trips feed-wide across all agencies).`);

    const tripToRouteDir = new Map();
    for (const t of trips) tripToRouteDir.set(t.trip_id, `${t.route_id}|${t.direction_id ?? "0"}`);

    // --- stop_times.txt: two streaming passes over the full (multi-agency) file ---
    // Pass 1: per-trip stop_times row count (to pick each direction's longest/
    // most-complete recorded trip) + the full set of stop_ids actually used by
    // ANY BEST trip (for a complete, not just representative-trip, stop layer).
    console.log("Pass 1/2 over stop_times.txt: counting rows per BEST trip...");
    const tripStopCounts = new Map();
    const usedStopIds = new Set();
    await readCsvStream(join(extractDir, "stop_times.txt"), (r) => {
      if (tripIds.has(r.trip_id)) {
        tripStopCounts.set(r.trip_id, (tripStopCounts.get(r.trip_id) || 0) + 1);
        usedStopIds.add(r.stop_id);
      }
    });

    // Longest trip per route+direction = that direction's representative
    // stop-sequence alignment (no shapes.txt exists in this feed to draw
    // instead — see header comment).
    const representativeTripByRouteDir = new Map();
    for (const [tripId, count] of tripStopCounts) {
      const key = tripToRouteDir.get(tripId);
      if (!key) continue;
      const cur = representativeTripByRouteDir.get(key);
      if (!cur || count > cur.count) representativeTripByRouteDir.set(key, { tripId, count });
    }
    const representativeTripIds = new Set([...representativeTripByRouteDir.values()].map((v) => v.tripId));

    console.log(`Pass 2/2 over stop_times.txt: collecting ordered stop sequences for ${representativeTripIds.size} representative trips...`);
    const tripStopSeqs = new Map();
    await readCsvStream(join(extractDir, "stop_times.txt"), (r) => {
      if (representativeTripIds.has(r.trip_id)) {
        if (!tripStopSeqs.has(r.trip_id)) tripStopSeqs.set(r.trip_id, []);
        tripStopSeqs.get(r.trip_id).push({ seq: parseInt(r.stop_sequence, 10), stop_id: r.stop_id });
      }
    });
    for (const arr of tripStopSeqs.values()) arr.sort((a, b) => a.seq - b.seq);

    // --- stops used by BEST (any trip, not just representative ones) ---
    const stopsById = new Map();
    for (const s of allStops) if (usedStopIds.has(s.stop_id)) stopsById.set(s.stop_id, s);
    console.log(`BEST stop network: ${stopsById.size} stops actually used by a BEST trip (out of ${allStops.length} stops feed-wide).`);

    // --- one LineString per route+direction (this feed splits many routes
    // into separate Up/Down route_ids too, so this can exceed routes.length) ---
    const routeById = new Map(routes.map((r) => [r.route_id, r]));
    const routeLines = [];
    for (const [key, { tripId }] of representativeTripByRouteDir) {
      const [routeId, directionIdStr] = key.split("|");
      const seq = tripStopSeqs.get(tripId) || [];
      const coordinates = [];
      let distanceKm = 0;
      let prev = null;
      for (const s of seq) {
        const stop = stopsById.get(s.stop_id);
        if (!stop) continue;
        const lat = round6(Number(stop.stop_lat));
        const lon = round6(Number(stop.stop_lon));
        coordinates.push([lon, lat]);
        if (prev) distanceKm += haversineKm(prev[1], prev[0], lat, lon);
        prev = [lon, lat];
      }
      if (coordinates.length < 2) continue;
      const route = routeById.get(routeId);
      routeLines.push({
        gtfsRouteId: routeId,
        directionId: Number(directionIdStr),
        shortName: route?.route_short_name ?? "",
        longName: route?.route_long_name ?? "",
        tripId,
        stopCount: coordinates.length,
        distanceKm: Math.round(distanceKm * 10) / 10,
        geometryType: "approximate_stop_sequence",
        geometry: { type: "LineString", coordinates },
      });
    }
    console.log(`Derived ${routeLines.length} route-direction LineStrings.`);

    // --- curated demo routes (Fleet/RouteDetail pages) ---
    const routeLinesByRouteId = new Map();
    for (const line of routeLines) {
      const list = routeLinesByRouteId.get(line.gtfsRouteId) ?? [];
      list.push(line);
      routeLinesByRouteId.set(line.gtfsRouteId, list);
    }
    const tripCountByRoute = new Map();
    for (const t of trips) tripCountByRoute.set(t.route_id, (tripCountByRoute.get(t.route_id) ?? 0) + 1);

    const curatedRoutes = CURATED_ROUTE_IDS.map((routeId) => {
      const route = routeById.get(routeId);
      if (!route) throw new Error(`Curated route_id ${routeId} not found in this feed's BEST routes`);
      const candidateLines = routeLinesByRouteId.get(routeId) ?? [];
      // Prefer the longest derived line for this route_id as the basis for
      // origin/destination/distance (real, derived data either way).
      const line = candidateLines.sort((a, b) => b.distanceKm - a.distanceKm)[0];
      const [originName, destinationName] = route.route_long_name.split("⇆").map((s) => s.trim());
      const originCoord = line?.geometry.coordinates[0];
      const destCoord = line?.geometry.coordinates[line.geometry.coordinates.length - 1];
      if (!line || !originCoord || !destCoord) {
        throw new Error(`Could not derive a stop-sequence line for curated route ${routeId}`);
      }
      return {
        gtfsRouteId: route.route_id,
        shortName: route.route_short_name,
        longName: route.route_long_name,
        origin: { stopId: "", name: originName ?? route.route_long_name, latitude: originCoord[1], longitude: originCoord[0] },
        destination: { stopId: "", name: destinationName ?? route.route_long_name, latitude: destCoord[1], longitude: destCoord[0] },
        approxDistanceKm: line.distanceKm,
        scheduledTripCount: tripCountByRoute.get(routeId) ?? 0,
      };
    });

    const stopsOut = [...stopsById.values()].map((s) => ({
      stopId: s.stop_id,
      name: s.stop_name,
      latitude: round6(Number(s.stop_lat)),
      longitude: round6(Number(s.stop_lon)),
      // This feed's stops.txt carries no stop_desc/area field (unlike the
      // old ChaloBEST feed) — left null rather than fabricated.
      area: null,
    }));

    const feedInfoRow = feedInfo[0];
    const fmtDate = (d) => (d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null);
    const serviceStartDate = fmtDate(feedInfoRow?.feed_start_date);
    const serviceEndDate = fmtDate(feedInfoRow?.feed_end_date);
    const today = new Date().toISOString().slice(0, 10);
    const isCurrent = Boolean(serviceStartDate && serviceEndDate && serviceStartDate <= today && today <= serviceEndDate);

    const source = {
      agency: bestAgency.agency_name,
      datasetName: "mumbai-gtfs community feed — BEST slice",
      repository: SOURCE_REPOSITORY,
      mobilityDatabaseFeedUrl: MOBILITY_DATABASE_FEED_URL,
      license: "MIT-0",
      filesUsed: ["agency.txt", "feed_info.txt", "calendar.txt", "routes.txt", "stops.txt", "trips.txt", "stop_times.txt"],
      retrievedAt: new Date().toISOString(),
      serviceStartDate,
      serviceEndDate,
      isCurrent,
      hasShapes: false,
      hasApproximateGeometry: true,
      notes:
        "Community-maintained GTFS feed for Mumbai-region bus operators (github.com/croyla/mumbai-gtfs, MIT-0 licensed; " +
        "also listed on the Mobility Database as mdb-3138). This is NOT an official publication by BEST or any transit " +
        "authority, and it carries no live vehicle-location data — every bus position shown in this app is Fleet " +
        "Drishti's own simulation, never real BEST GPS. The source feed covers four operators (BEST, KDMT, TMT, VVMT); " +
        "this project's current scope is Mumbai + BEST only, so everything here has been filtered to agency_id=BEST. " +
        "The feed has no shapes.txt, so there is no authoritative route-line geometry — mumbaiBestRouteLines.json " +
        "instead derives one approximate LineString per route+direction by connecting that direction's real stops in " +
        "their recorded stop_sequence order (grouped by trip from trips.txt/stop_times.txt), same approach as before, " +
        "never a fabricated or hand-drawn shape.",
      totalRoutesInFeed: routes.length,
      totalStopsInFeed: stopsOut.length,
      totalTripsInFeed: trips.length,
      totalRouteLinesDerived: routeLines.length,
      curatedRouteIds: CURATED_ROUTE_IDS,
    };

    writeFileSync(join(OUT_DIR, "source.json"), JSON.stringify(source, null, 2));
    writeFileSync(join(OUT_DIR, "mumbaiBestRoutes.json"), JSON.stringify(curatedRoutes, null, 2));
    writeFileSync(join(OUT_DIR, "mumbaiBestStops.json"), JSON.stringify(stopsOut));
    writeFileSync(join(OUT_DIR, "mumbaiBestRouteLines.json"), JSON.stringify(routeLines));

    console.log(`Wrote ${curatedRoutes.length} curated routes, ${stopsOut.length} stops, and ${routeLines.length} route-direction lines to ${OUT_DIR}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
