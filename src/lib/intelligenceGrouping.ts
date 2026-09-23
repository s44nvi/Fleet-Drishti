import type { Event, Issue, Severity } from "../types";

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export interface IntelligenceGroup {
  key: string;
  subtype: string;
  location: string;
  /** Coordinates of the most recent observation in the group — enough to
   * place a map marker for a not-yet-corroborated group, which has no
   * Issue record (and therefore no Issue.latitude/longitude) of its own. */
  latitude: number;
  longitude: number;
  busIds: string[];
  observationCount: number;
  /** Chronological confidence readings across every observation in the
   * group — shown as a progression (e.g. "85% -> 88% -> 91%") rather than
   * as repeated, seemingly-unrelated rows. */
  confidenceSequence: number[];
  firstDetected: string;
  lastObserved: string;
  linkTo: string;
  corroborated: boolean;
  /** Every Event in the group, oldest first. */
  eventIds: string[];
  /** Highest severity among the group's Events. */
  severity: Severity;
}

// Groups raw per-bus Events into one intelligence card per real-world
// problem, mirroring how the backend fuses Events into an Issue. An event
// already correlated into an Issue groups under that issue's id; anything
// not yet fused falls back to a subtype+location cluster key so near-
// duplicate single-bus sightings of the same thing still read as one card
// instead of N unrelated rows.
export function groupEventsIntoIntelligence(events: Event[], issues: Issue[]): IntelligenceGroup[] {
  const groups = new Map<string, IntelligenceGroup>();

  const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const event of sortedEvents) {
    const issue = issues.find((candidate) => candidate.relatedEventIds.includes(event.eventId));
    const key = issue ? issue.issueId : `${event.subtype}::${event.location}`;

    const existing = groups.get(key);
    if (existing) {
      if (!existing.busIds.includes(event.busId)) existing.busIds.push(event.busId);
      existing.observationCount += 1;
      existing.confidenceSequence.push(event.confidence);
      existing.lastObserved = event.timestamp;
      existing.latitude = event.latitude;
      existing.longitude = event.longitude;
      existing.corroborated = existing.busIds.length > 1;
      existing.eventIds.push(event.eventId);
      if (SEVERITY_RANK[event.severity] > SEVERITY_RANK[existing.severity]) existing.severity = event.severity;
      continue;
    }

    groups.set(key, {
      key,
      subtype: event.subtype,
      location: event.location,
      latitude: event.latitude,
      longitude: event.longitude,
      busIds: [event.busId],
      observationCount: 1,
      confidenceSequence: [event.confidence],
      firstDetected: event.timestamp,
      lastObserved: event.timestamp,
      linkTo: issue ? `/road-issues/${issue.issueId}` : `/fleet/${event.busId}`,
      corroborated: false,
      eventIds: [event.eventId],
      severity: event.severity,
    });
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.lastObserved).getTime() - new Date(a.lastObserved).getTime(),
  );
}
