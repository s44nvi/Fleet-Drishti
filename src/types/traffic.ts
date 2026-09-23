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
