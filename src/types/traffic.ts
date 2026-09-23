export type CongestionLevel = "low" | "medium" | "high" | "severe";

// A continuously monitored corridor congestion signal — distinct from an
// Issue because it describes an ongoing condition, not a discrete fault.
export interface TrafficHotspot {
  hotspotId: string;
  location: string;
  corridor: string;
  latitude: number;
  longitude: number;
  congestionLevel: CongestionLevel;
  averageSpeedKph: number;
  observingBusCount: number;
  observedAt: string;
}

// A real major-road polyline near a monitored corridor (OpenStreetMap
// geometry, see scripts/fetch-corridor-roads.mjs). Carries no traffic
// values itself — congestion is joined onto it at render time.
export interface CorridorRoad {
  id: number;
  highway: string;
  name: string;
  coordinates: [number, number][];
}
