import { useEffect, useRef, useState } from "react";
import type { AnalyticsCategory, AnalyticsDomain } from "../../services/analyticsService";

// Series colours for the Analytics workspace — the design-system domain
// tones (MASTER §2), so "Safety" is the same purple here as on Safety.
export const DOMAIN_COLOR: Record<AnalyticsDomain, string> = {
  "Road Issues": "#dc2626",
  Traffic: "#e08a00",
  Safety: "#7c3aed",
  Infrastructure: "#1d5fe0",
};

export const CATEGORY_COLOR: Record<AnalyticsCategory, string> = {
  Pothole: "#dc2626",
  "Traffic / Congestion": "#e08a00",
  "Pedestrian Safety": "#7c3aed",
  Waterlogging: "#1d5fe0",
  "Road Damage": "#0e7490",
  "Missing Infrastructure": "#8fa3bf",
  Other: "#cbd3de",
};

export const RANGE_OPTIONS = [
  { days: 7, label: "Last 7 days", short: "7D" },
  { days: 30, label: "Last 30 days", short: "30D" },
  { days: 90, label: "Last 90 days", short: "90D" },
] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number]["days"];

// Fixed three-letter months ("12 Sep") — Intl's en-IN/en-GB give "Sept".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NUM_FMT = new Intl.NumberFormat("en-IN");

export const fmtDay = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
export const fmtDate = (iso: string) => `${fmtDay(iso)} ${iso.slice(0, 4)}`;
export const fmtNum = (n: number) => NUM_FMT.format(n);

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// Width of an element, tracked — lets SVG charts draw at true pixel size so
// text and strokes stay crisp instead of scaling with a viewBox.
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measure now; ResizeObserver's first callback waits for a paint.
    setWidth(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
