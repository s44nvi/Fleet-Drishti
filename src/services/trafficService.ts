import type { CorridorRoad, TrafficProfiles } from "../types";
import { buildTrafficProfiles } from "../lib/trafficProfiles";
import { issueService } from "./issueService";
import { mockAsync } from "./mockAsync";

// The Traffic page's data boundary. Today: the DEMO day × hour traffic
// profiles, the fixture congestion snapshot, and real OSM road geometry.
// When the fleet produces real traffic observations (bus camera/sensor +
// GPS + timestamp → per-segment aggregation), swap listTrafficProfiles'
// body for that aggregate in the same TrafficProfiles shape — the UI stays
// the same.
export const trafficService = {
  /** profiles[day][hour].segments[segmentId] — DEMO today. */
  listTrafficProfiles(): Promise<TrafficProfiles> {
    return mockAsync(buildTrafficProfiles());
  },

  /** Latest per-corridor reading — fixture snapshot (SIMULATED) today. */
  listCorridorReadings() {
    return issueService.listTrafficHotspots();
  },

  /** Real major-road geometry across Greater Mumbai (OpenStreetMap). Code-split. */
  async listMumbaiRoads(): Promise<CorridorRoad[]> {
    const { default: roads } = await import("../data/traffic/mumbaiRoads.json");
    return mockAsync(roads as CorridorRoad[]);
  },
};
