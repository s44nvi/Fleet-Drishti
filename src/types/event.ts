import type { Severity } from "./common";

export type EventType = "road-defect" | "traffic" | "safety" | "infrastructure" | "environmental";

// A single validated observation made by one bus at one moment — the output
// of tracking/spatial-filtering a Detection. Multiple Events from different
// buses about the same real-world problem are later fused into one Issue.
export interface Event {
  eventId: string;
  eventType: EventType;
  subtype: string;
  severity: Severity;
  confidence: number;
  busId: string;
  routeId: string;
  cameraId: string;
  detectionId?: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  location: string;
  landmark?: string;
  evidenceUrl: string;
  metadata: Record<string, string | number>;
}
