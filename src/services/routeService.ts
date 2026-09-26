import type { Bus, NetworkRouteLine, Route, TransitRouteSummary, TransitStop } from "../types";
import { mockRoutes, mockBuses } from "../data/mock";
import { mockAsync } from "./mockAsync";
import { getNetworkRouteLines, getNetworkStops, getRouteIndex } from "../lib/gtfs/adapter";

export const routeService = {
  listRoutes(): Promise<Route[]> {
    return mockAsync(mockRoutes);
  },

  getRouteById(routeId: string): Promise<Route | undefined> {
    return mockAsync(mockRoutes.find((route) => route.routeId === routeId));
  },

  listBusesForRoute(routeId: string): Promise<Bus[]> {
    return mockAsync(mockBuses.filter((bus) => bus.routeId === routeId));
  },

  /** Every stop served by a trip in the Mumbai-region GTFS feed (BEST,
   * TMT, KDMT, VVMT; see src/data/gtfs/source.json) — static reference
   * points, not a live arrivals feed. Each carries a display `tier`; map
   * callers zoom-gate by it so ~7,500 stops never draw at once. */
  async listNetworkStops(): Promise<TransitStop[]> {
    const stops = await getNetworkStops();
    return mockAsync(stops);
  },

  /** One path per route + direction, all operators. BEST is road-snapped
   * (OSRM, validated against the real stops); others are schematic stop
   * sequences. Neither is official geometry — the feed has no shapes.txt
   * (see types/route.ts::RouteGeometrySource). */
  async listNetworkRouteLines(): Promise<NetworkRouteLine[]> {
    const lines = await getNetworkRouteLines();
    return mockAsync(lines);
  },

  /** Per-route GTFS facts (scheduled trips, stops served, extent). */
  async listRouteIndex(): Promise<TransitRouteSummary[]> {
    const index = await getRouteIndex();
    return mockAsync(index);
  },
};
