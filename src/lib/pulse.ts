import type { Event, SafetyEvent } from "../types";
import type { Tone } from "./visuals";

export type PulseDomain = "road" | "traffic" | "safety";

export const PULSE_DOMAINS: { key: PulseDomain; label: string; tone: Tone }[] = [
  { key: "road", label: "Road", tone: "alert" },
  { key: "traffic", label: "Traffic", tone: "watch" },
  { key: "safety", label: "Safety", tone: "safety" },
];

export interface PulseSeries {
  domain: PulseDomain;
  bins: number[];
  total: number;
}

export interface CityPulse {
  series: PulseSeries[];
  windowStart: string;
  windowEnd: string;
  binMinutes: number;
}

function domainForEvent(event: Event): PulseDomain | null {
  if (event.eventType === "road-defect" || event.eventType === "environmental" || event.eventType === "infrastructure") return "road";
  if (event.eventType === "traffic") return "traffic";
  if (event.eventType === "safety") return "safety";
  return null;
}

// Observations per time bin over the window ending at the dataset anchor,
// split by domain. Counts validated Events plus safety-domain signals that
// never reached the Event pipeline (a SafetyEvent matching an Event on bus +
// timestamp is the same sighting and is counted once).
export function computeCityPulse(
  events: Event[],
  safetyEvents: SafetyEvent[],
  anchor: string,
  windowMinutes = 60,
  binMinutes = 5,
): CityPulse {
  const end = new Date(anchor).getTime();
  const start = end - windowMinutes * 60_000;
  const binCount = Math.ceil(windowMinutes / binMinutes);
  const bins: Record<PulseDomain, number[]> = {
    road: Array(binCount).fill(0),
    traffic: Array(binCount).fill(0),
    safety: Array(binCount).fill(0),
  };

  const place = (domain: PulseDomain, timestamp: string) => {
    const t = new Date(timestamp).getTime();
    if (t <= start || t > end) return;
    const index = Math.min(binCount - 1, Math.floor((t - start) / (binMinutes * 60_000)));
    bins[domain][index] += 1;
  };

  for (const event of events) {
    const domain = domainForEvent(event);
    if (domain) place(domain, event.timestamp);
  }
  for (const signal of safetyEvents) {
    const duplicate = events.some((e) => e.busId === signal.busId && e.timestamp === signal.observedAt);
    if (!duplicate) place("safety", signal.observedAt);
  }

  return {
    series: PULSE_DOMAINS.map(({ key }) => ({ domain: key, bins: bins[key], total: bins[key].reduce((a, b) => a + b, 0) })),
    windowStart: new Date(start).toISOString(),
    windowEnd: anchor,
    binMinutes,
  };
}

// Latest timestamp anywhere in the given fixture rows — stands in for "now"
// in this demo dataset (see lib/timeAgo.ts).
export function datasetAnchor(timestamps: (string | undefined)[]): string {
  let latest = 0;
  for (const ts of timestamps) {
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (t > latest) latest = t;
  }
  return latest ? new Date(latest).toISOString() : new Date().toISOString();
}
