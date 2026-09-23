import type { GeoPoint } from "./common";

export type BusStatus = "active" | "idle" | "offline" | "maintenance";

// A single public-transport vehicle carrying the edge sensing hardware.
// This is the root of the sensing pipeline: Bus -> Camera -> Detection -> Event -> Issue.
//
// `busId`/`location` are always Fleet Drishti's own simulated fleet — there
// is no live BEST vehicle-GPS integration. `routeId` may reference a real
// GTFS-sourced Route (see types/route.ts's `networkSource`), but the vehicle
// itself, its position, and its camera/sensing status are never real BEST
// data. `vehiclePositionSource` makes that explicit rather than leaving it
// implicit.
export interface Bus {
  busId: string;
  label: string;
  routeId: string;
  status: BusStatus;
  location: GeoPoint;
  speedKph: number;
  cameraIds: string[];
  lastSeenAt: string;
  vehiclePositionSource: "SIMULATED";
}
