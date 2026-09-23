import type { CorridorRoad } from "../types";
import { analyticsService, type CorridorTrafficPattern } from "./analyticsService";
import { issueService } from "./issueService";
import { mockAsync } from "./mockAsync";

export type { CorridorTrafficPattern };

// The Traffic page's data boundary. Today: the DEMO day × hour pattern, the
// fixture congestion snapshot, and real OSM road geometry. When the fleet
// produces real traffic observations, swap these bodies (e.g. aggregate
// per-corridor speeds into the same `grid` shape) — the UI stays the same.
export const trafficService = {
  /** grid[day][hour] congestion index 0..1 per corridor — DEMO today. */
  listCorridorPatterns(): Promise<CorridorTrafficPattern[]> {
    return analyticsService.getTrafficPatternDemo();
  },

  /** Latest per-corridor reading — fixture snapshot (SIMULATED) today. */
  listCorridorReadings() {
    return issueService.listTrafficHotspots();
  },

  /** Real major-road geometry near each corridor (OpenStreetMap). Code-split. */
  async listCorridorRoads(): Promise<CorridorRoad[]> {
    const { default: roads } = await import("../data/traffic/corridorRoads.json");
    return mockAsync(roads as CorridorRoad[]);
  },
};
