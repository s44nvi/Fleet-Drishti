// Types shared across every domain model.

export type Severity = "critical" | "high" | "medium" | "low";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}
