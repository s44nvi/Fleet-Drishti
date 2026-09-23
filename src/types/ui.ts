import type { ReactNode } from "react";
import type { Severity } from "./common";

// View-layer types: shapes the UI needs that aren't backend domain entities.

export type BadgeTone = Severity | "info" | "live" | "success";

export interface KpiTile {
  id: string;
  label: string;
  value: string;
  /** Short qualifier rendered inline after the value, e.g. "Active" in
   * "6 Active" or "km" in "59.4 km" — keeps the primary number and its
   * unit/status on one line without concatenating them into `value`. */
  valueLabel?: string;
  badge?: string;
  badgeTone?: BadgeTone;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  caption: string;
}

export interface MapMarker {
  id: string;
  kind: "bus-probe" | "critical-distress" | "traffic-chokepoint" | "vulnerable-crossing" | "infrastructure-asset";
  label: string;
  latitude: number;
  longitude: number;
  href?: string;
  /** Real congestion severity (from TrafficHotspot.congestionLevel, "severe"
   * relabeled "critical" for display) — only meaningful on a
   * "traffic-chokepoint" marker, where GISMap uses it to shade the pin as a
   * lightweight congestion heatmap instead of one flat color. */
  intensity?: "low" | "medium" | "high" | "critical";
}

export interface PipelineStepData {
  id: string;
  order: number;
  label: string;
  status: "complete" | "pending";
  detail: string;
}

export interface NavLeafItem {
  label: string;
  path: string;
  icon: string;
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}
