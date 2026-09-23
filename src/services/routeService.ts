import type { Bus, NetworkRouteLine, Route, TransitStop } from "../types";
import { mockRoutes, mockBuses } from "../data/mock";
import { mockAsync } from "./mockAsync";
import { getNetworkRouteLines, getNetworkStops } from "../lib/gtfs/adapter";

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

  /** Real BEST stop network data adapted from the public mumbai-gtfs
   * community feed (see src/data/gtfs/source.json) — static reference
   * points, not a live arrivals feed. Callers rendering these on a map are
   * responsible for zoom-gating visibility so the network layer doesn't
   * overwhelm it. */
  async listNetworkStops(): Promise<TransitStop[]> {
    const stops = await getNetworkStops();
    return mockAsync(stops);
  },

  /** Real BEST route paths adapted from the public GTFS feed — each an
   * approximate stop-sequence-derived LineString (see
   * types/route.ts::NetworkRouteLine), never official route geometry
   * (this feed has no shapes.txt). */
  async listNetworkRouteLines(): Promise<NetworkRouteLine[]> {
    const lines = await getNetworkRouteLines();
    return mockAsync(lines);
  },
};
