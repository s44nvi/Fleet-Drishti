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

// A DEMO sensing bus used only to show fleet density on the maps. It is
// placed deterministically on a real GTFS route line (see
// lib/gtfs/demoFleet.ts), but the vehicle, its position and its sensing
// state are illustrative — never GPS, never a real operator's vehicle.
// Kept separate from `Bus` (the fixture fleet the rest of the app reasons
// about) so demo buses can't leak into counts, KPIs or the Fleet roster.
export interface DemoSensingBus {
  busId: string;
  agencyId: string;
  gtfsRouteId: string;
  routeShortName: string;
  routeLongName: string;
  directionId: number;
  /** Real terminals of the direction the demo bus is placed on. */
  fromStop: string;
  toStop: string;
  status: "active" | "idle";
  cameraCount: number;
  camerasOnline: number;
  latitude: number;
  longitude: number;
  /** Nearest real GTFS stop to the demo position, if one is close. */
  nearStopName: string | null;
  positionSource: "DEMO";
}
