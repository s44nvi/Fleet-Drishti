import {
  Bus,
  CarFront,
  CircleDot,
  Construction,
  Footprints,
  OctagonAlert,
  PersonStanding,
  SeparatorVertical,
  Signpost,
  TriangleAlert,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Severity } from "../types";

// One visual vocabulary for every domain: which tone and which glyph a
// category is drawn with, wherever it appears (map marker, list row icon
// tile, video bounding box). See design-system/fleet-drishti/MASTER.md §2/§4.

export type Tone = "action" | "ok" | "watch" | "alert" | "safety" | "neutral";

// Literal class strings (not template-built) so Tailwind can see them.
export const TONE_CLASSES: Record<Tone, { solid: string; soft: string; ink: string; dot: string; border: string }> = {
  action: { solid: "bg-action", soft: "bg-action-soft", ink: "text-action", dot: "bg-action", border: "border-action" },
  ok: { solid: "bg-ok", soft: "bg-ok-soft", ink: "text-ok-ink", dot: "bg-ok", border: "border-ok" },
  watch: { solid: "bg-watch", soft: "bg-watch-soft", ink: "text-watch-ink", dot: "bg-watch", border: "border-watch" },
  alert: { solid: "bg-alert", soft: "bg-alert-soft", ink: "text-alert-ink", dot: "bg-alert", border: "border-alert" },
  safety: { solid: "bg-safety", soft: "bg-safety-soft", ink: "text-safety-ink", dot: "bg-safety", border: "border-safety" },
  neutral: { solid: "bg-ink-2", soft: "bg-surface-2", ink: "text-ink-2", dot: "bg-ink-3", border: "border-line-strong" },
};

// Raw hex values for places that can't use Tailwind classes (MapLibre paint
// properties, SVG strokes drawn over video).
export const TONE_HEX: Record<Tone, string> = {
  action: "#1d5fe0",
  ok: "#16a34a",
  watch: "#e08a00",
  alert: "#dc2626",
  safety: "#7c3aed",
  neutral: "#475467",
};

export const SEVERITY_TONE: Record<Severity, Tone> = {
  critical: "alert",
  high: "alert",
  medium: "watch",
  low: "ok",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export interface CategoryVisual {
  icon: LucideIcon;
  label: string;
  tone: Tone;
}

// Keyed by every subtype / objectClass / assetType string present in the
// fixtures (Event.subtype, Detection.objectClass, SafetyEvent.type,
// InfrastructureIssue.assetType) plus the PS categories that have no
// fixture data yet, so a future record renders correctly on arrival.
const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  pothole: { icon: CircleDot, label: "Pothole", tone: "alert" },
  "road-damage": { icon: Construction, label: "Road damage", tone: "watch" },
  "surface-crack": { icon: Construction, label: "Surface crack", tone: "watch" },
  waterlogging: { icon: Waves, label: "Waterlogging", tone: "action" },
  "missing-divider": { icon: SeparatorVertical, label: "Missing divider", tone: "watch" },
  barrier: { icon: SeparatorVertical, label: "Divider / barrier", tone: "watch" },
  "faded-crossing": { icon: Footprints, label: "Faded zebra crossing", tone: "watch" },
  "missing-crossing": { icon: Footprints, label: "Missing zebra crossing", tone: "watch" },
  "damaged-signboard": { icon: Signpost, label: "Damaged signboard", tone: "watch" },
  "missing-signboard": { icon: Signpost, label: "Missing signboard", tone: "watch" },
  signage: { icon: Signpost, label: "Signboard", tone: "watch" },
  congestion: { icon: CarFront, label: "Congestion", tone: "watch" },
  "stalled-traffic": { icon: CarFront, label: "Stalled traffic", tone: "watch" },
  "lane-blockage": { icon: OctagonAlert, label: "Lane blockage", tone: "watch" },
  "stalled-vehicle": { icon: OctagonAlert, label: "Stalled vehicle", tone: "watch" },
  "pedestrian-conflict": { icon: PersonStanding, label: "Pedestrian conflict", tone: "safety" },
  pedestrian: { icon: PersonStanding, label: "Pedestrian", tone: "safety" },
  "crossing-risk": { icon: Footprints, label: "Crossing risk", tone: "safety" },
  "near-miss": { icon: Zap, label: "Near miss", tone: "safety" },
  bus: { icon: Bus, label: "Bus", tone: "action" },
};

export function categoryVisual(key: string): CategoryVisual {
  return (
    CATEGORY_VISUALS[key] ?? {
      icon: TriangleAlert,
      label: key
        .split("-")
        .map((word, i) => (i === 0 ? word[0].toUpperCase() + word.slice(1) : word))
        .join(" "),
      tone: "neutral",
    }
  );
}

// Sentence-case a kebab-case fixture value ("under-review" -> "Under review").
export function humanize(value: string): string {
  const text = value.replace(/-/g, " ");
  return text[0].toUpperCase() + text.slice(1);
}
