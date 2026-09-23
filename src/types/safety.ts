import type { Severity } from "./common";

export type SafetyEventType = "pedestrian-conflict" | "crossing-risk" | "near-miss";

// A continuously monitored pedestrian/vulnerable-road-user risk signal.
// Severe, persistent safety signals may be escalated into an Issue.
export interface SafetyEvent {
  safetyEventId: string;
  type: SafetyEventType;
  location: string;
  latitude: number;
  longitude: number;
  severity: Severity;
  confidence: number;
  busId: string;
  observedAt: string;
}
