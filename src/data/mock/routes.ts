import type { Route } from "../../types";
import { getNetworkRoutes } from "../../lib/gtfs/adapter";
import { mockBuses } from "./buses";

// Route identity/geography/distance here is real BEST network data adapted
// from the public mumbai-gtfs community feed (see src/data/gtfs/source.json
// and scripts/ingest-gtfs.mjs) — `networkSource: "GTFS_BEST"` on each entry
// marks that. `assignedBusIds`/`activeBusCount` are always Fleet Drishti's
// own simulated sensing fleet, computed here from mockBuses, never real BEST
// vehicle-assignment data.
export const mockRoutes: Route[] = getNetworkRoutes().map((route) => {
  const assignedBuses = mockBuses.filter((bus) => bus.routeId === route.routeId);
  return {
    ...route,
    assignedBusIds: assignedBuses.map((bus) => bus.busId),
    activeBusCount: assignedBuses.filter((bus) => bus.status === "active").length,
  };
});
