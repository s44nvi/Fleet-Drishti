import type { Issue, Severity } from "../types";

// Deterministic, explainable stand-in for the product's AHP-style
// prioritization — every factor is derived from real fields already on the
// Issue (no hidden randomness), but the weighting below is a UI-layer demo
// model, not a live backend scoring service. Surfacing it as compact bars
// lets a viewer see *why* something ranks where it does without dumping the
// underlying math on them.
const SEVERITY_SCORE: Record<Severity, number> = {
  critical: 95,
  high: 75,
  medium: 50,
  low: 25,
};

export interface PriorityFactor {
  key: string;
  label: string;
  value: number; // 0-100
}

export interface PriorityBreakdown {
  score: number; // 0-100
  factors: PriorityFactor[];
}

const WEIGHTS = {
  severity: 0.3,
  confidence: 0.2,
  repetition: 0.2,
  exposure: 0.15,
  duration: 0.15,
};

export function computePriorityBreakdown(issue: Issue): PriorityBreakdown {
  const severity = SEVERITY_SCORE[issue.severity];
  const confidence = issue.confidence;
  const repetition = Math.min(100, issue.observationCount * 30);
  const exposure = Math.min(
    100,
    issue.observingBuses.length * 25 + (issue.type === "traffic-blockage" ? 20 : issue.type === "safety" ? 15 : 0),
  );
  const observedMinutes = Math.max(
    0,
    (new Date(issue.lastSeen).getTime() - new Date(issue.firstSeen).getTime()) / 60000,
  );
  const duration = issue.status === "resolved" ? 20 : Math.min(100, 40 + observedMinutes * 5);

  const factors: PriorityFactor[] = [
    { key: "severity", label: "Severity", value: Math.round(severity) },
    { key: "confidence", label: "Confidence", value: Math.round(confidence) },
    { key: "repetition", label: "Repetition", value: Math.round(repetition) },
    { key: "exposure", label: "Exposure", value: Math.round(exposure) },
    { key: "duration", label: "Duration", value: Math.round(duration) },
  ];

  const score = Math.round(
    severity * WEIGHTS.severity +
      confidence * WEIGHTS.confidence +
      repetition * WEIGHTS.repetition +
      exposure * WEIGHTS.exposure +
      duration * WEIGHTS.duration,
  );

  return { score, factors };
}
