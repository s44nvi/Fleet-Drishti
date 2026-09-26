import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "../lib/visuals";

// View-layer types: shapes the UI needs that aren't backend domain entities.

export type BadgeTone = Tone;

export interface KpiTile {
  id: string;
  label: string;
  value: string;
  /** Unit rendered small after the value ("km/h"). */
  unit?: string;
  /** One short qualifier under the label ("of 7 in fleet", "2 critical"). */
  sub?: string;
  subTone?: Tone;
  icon?: LucideIcon;
  tone?: Tone;
}

export type MapMarkerKind =
  | "bus-probe"
  | "critical-distress"
  | "traffic-chokepoint"
  | "vulnerable-crossing"
  | "infrastructure-asset";

export interface MapMarker {
  id: string;
  kind: MapMarkerKind;
  label: string;
  /** Second tooltip line (location, time, bus). */
  detail?: string;
  latitude: number;
  longitude: number;
  href?: string;
  /** Fixture subtype/objectClass/assetType — picks the marker glyph via
   * lib/visuals.ts. Falls back to the kind's default glyph. */
  category?: string;
  /** Real severity/congestion reading — shades the marker instead of the
   * kind's default tone. */
  intensity?: "low" | "medium" | "high" | "critical";
  /** Explicit tone override (e.g. a bus's online/idle status). */
  tone?: Tone;
  /** Observed within the last 5 minutes of the dataset anchor — draws a
   * single recency ring. */
  recent?: boolean;
  /** Bus markers: where the position comes from. SIMULATED = the fixture
   * fleet; DEMO = the density layer placed on GTFS routes. Never GPS. */
  positionSource?: "SIMULATED" | "DEMO";
  /** GTFS route this bus runs, for route highlighting and route popups. */
  gtfsRouteId?: string;
  /** Leave out of the initial "fit to markers" framing (density layers
   * shouldn't widen the view to the whole region). */
  excludeFromFit?: boolean;
}

export interface NavLeafItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}
