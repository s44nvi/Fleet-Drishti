import type { BadgeTone, CongestionLevel } from "../types";

// TrafficHotspot.congestionLevel is the single existing congestion-severity
// signal in the data model — every congestion-related display (map marker
// shading, badges, labels) derives from it rather than introducing a
// second severity scale.
export function congestionToIntensity(level: CongestionLevel): "low" | "medium" | "high" | "critical" {
  return level === "severe" ? "critical" : level;
}

// Display-only relabeling ("severe" -> "Critical") to match the PS's
// LOW/MEDIUM/HIGH/CRITICAL vocabulary — the underlying CongestionLevel
// value and its badge tone are unchanged.
export const CONGESTION_DISPLAY_LABEL: Record<CongestionLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  severe: "Critical",
};

// Reused everywhere a congestion badge is rendered (Traffic page, its
// corridor/bottleneck cards) so severity color always means the same thing.
export const CONGESTION_TONE: Record<CongestionLevel, BadgeTone> = {
  low: "ok",
  medium: "watch",
  high: "alert",
  severe: "alert",
};
