import type { Issue, IssueStatus, IssueType, InfrastructureIssue, SafetyEvent, Severity, TrafficHotspot } from "../types";
import { mockInfrastructureIssues, mockIssues, mockSafetyEvents, mockTrafficHotspots } from "../data/mock";
import { computeTopHotspots, type Hotspot } from "../lib/hotspots";
import { isInfrastructureAssetInScope } from "../lib/taxonomy";
import { mockAsync } from "./mockAsync";
import { apiRequest, ApiError } from "../lib/apiClient";

// Real backend IssueOut shape (already camelCased by apiClient) — only the
// fields that genuinely exist on the backend today. See mapBackendIssue for
// how this becomes a full frontend Issue.
interface BackendIssue {
  id: string;
  type: string;
  subtype: string;
  lat: number;
  lng: number;
  severity: string | null;
  priority: number | null;
  confidence: number;
  observationCount: number;
  status: string;
  firstSeen: string;
  lastSeen: string;
  createdAt: string;
}

// Maps a real backend Issue onto the full frontend Issue shape.
//
// Fields that genuinely exist and match: id, type, subtype, severity,
// confidence (0-1 -> 0-100 scale), lat/lng, first/lastSeen, status,
// observationCount.
//
// Fields the backend has no data for (location, observingBuses,
// relatedEventIds, evidence) are left genuinely empty below — never
// fabricated — per the confirmed category-(b) scope: the backend does no
// reverse-geocoding and has no issue->bus/event/evidence aggregation
// endpoint. Pages that display those fields (corroboration count, evidence
// player, location text) will honestly show "none"/"0" for real issues
// until that backend work is scoped separately.
//
// `type`/`status` are passed through as-is with a type-level cast: the
// backend's taxonomy (road_defect/traffic_density/pedestrian_hazard,
// unresolved/acknowledged/...) does not match this frontend's IssueType/
// IssueStatus unions (road-defect/traffic-blockage/.../new/resolved/...).
// This is the confirmed category-(b) taxonomy mismatch — deliberately NOT
// translated or guessed at here.
function mapBackendIssue(issue: BackendIssue): Issue {
  return {
    issueId: issue.id,
    type: issue.type as IssueType,
    subtype: issue.subtype,
    // Backend severity is guaranteed non-null once an issue exists, but the
    // schema types it Optional — "low" is a safe fallback, never "critical"
    // (the backend never produces that value; see category-(b) note).
    severity: (issue.severity ?? "low") as Severity,
    confidence: Math.round(issue.confidence * 100),
    latitude: issue.lat,
    longitude: issue.lng,
    location: "",
    firstSeen: issue.firstSeen,
    lastSeen: issue.lastSeen,
    observationCount: issue.observationCount,
    observingBuses: [],
    relatedEventIds: [],
    evidence: [],
    status: issue.status as IssueStatus,
  };
}

// Fused/detected-condition data: Issues (the multi-bus-correlated entities
// that reach the priority queue) plus the three lighter detection domains
// that feed the Road/Traffic/Safety/Infrastructure intelligence screens.
// Grouped in one service because they all represent "what was detected and
// needs review", as opposed to fleetService (who observed it).
export const issueService = {
  async listIssues(): Promise<Issue[]> {
    const issues = await apiRequest<BackendIssue[]>("/issues");
    return issues.map(mapBackendIssue);
  },

  async getIssueById(issueId: string): Promise<Issue | undefined> {
    try {
      const issue = await apiRequest<BackendIssue>(`/issues/${issueId}`);
      return mapBackendIssue(issue);
    } catch (error) {
      // 404 genuinely means "no such issue" (IssueIntelligence's existing
      // not-found EmptyState) — anything else (network/5xx/401) should
      // surface as a real error, not be silently treated as not-found.
      if (error instanceof ApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  },

  listPriorityIssues(): Promise<Issue[]> {
    return mockAsync(
      mockIssues
        .filter((issue) => issue.status !== "resolved" && (issue.severity === "critical" || issue.severity === "high"))
        .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1)),
    );
  },

  listTrafficHotspots(): Promise<TrafficHotspot[]> {
    return mockAsync(mockTrafficHotspots);
  },

  listSafetyEvents(): Promise<SafetyEvent[]> {
    return mockAsync(mockSafetyEvents);
  },

  listInfrastructureIssues(): Promise<InfrastructureIssue[]> {
    return mockAsync(mockInfrastructureIssues);
  },

  // Spatially clustered, cross-domain hotspots — see lib/hotspots.ts.
  listTopHotspots(): Promise<Hotspot[]> {
    return mockAsync(
      computeTopHotspots({
        issues: mockIssues,
        trafficHotspots: mockTrafficHotspots,
        safetyEvents: mockSafetyEvents,
        // Only PS-scope infrastructure (see lib/taxonomy.ts).
        infrastructureIssues: mockInfrastructureIssues.filter((item) => isInfrastructureAssetInScope(item.assetType)),
      }),
    );
  },
};
