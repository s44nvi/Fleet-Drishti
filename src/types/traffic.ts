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

// A real major-road polyline in Greater Mumbai (OpenStreetMap geometry, see
// scripts/fetch-corridor-roads.mjs). Carries no traffic values itself —
// congestion is joined onto it at render time.
export interface CorridorRoad {
  id: number;
  highway: string;
  name: string;
  ref?: string;
  /** One-way carriageway; its vertex order is the direction of travel. */
  oneway?: boolean;
  coordinates: [number, number][];
}

// --- Traffic profiles -------------------------------------------------------
// trafficProfiles[day][hour][segmentId] → SegmentTraffic. Today the values
// come from a deterministic DEMO model; later they are aggregated from
// bus-derived observations (camera/sensor + GPS + timestamp) per corridor
// segment, in exactly this shape.

/** "forward" = the corridor's anchor order (towards the city centre for
 * radial highways, west → east for cross-city links). */
export type TravelDirection = "forward" | "reverse";

export interface SegmentTraffic {
  segmentId: string;
  /** 0..1 congestion index per direction of travel. */
  forward: number;
  reverse: number;
  /** max(forward, reverse). */
  intensity: number;
  /** The direction under more pressure. */
  direction: TravelDirection;
  speedKph: number;
  level: CongestionLevel;
  /** How much to trust the value; demo values are flagged as such. */
  confidence: number;
  status: "demo" | "observed";
}

export interface AreaTraffic {
  areaId: string;
  intensity: number;
}

export interface TrafficSnapshot {
  segments: Record<string, SegmentTraffic>;
  areas: Record<string, AreaTraffic>;
}

/** [day 0 = Monday][hour 0..23] */
export type TrafficProfiles = TrafficSnapshot[][];
