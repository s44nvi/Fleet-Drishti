import type { InfrastructureIssue, Issue, SafetyEvent, TrafficHotspot } from "../types";
import { mockInfrastructureIssues, mockIssues, mockSafetyEvents, mockTrafficHotspots } from "../data/mock";
import { computeTopHotspots, type Hotspot } from "../lib/hotspots";
import { mockAsync } from "./mockAsync";

// Fused/detected-condition data: Issues (the multi-bus-correlated entities
// that reach the priority queue) plus the three lighter detection domains
// that feed the Road/Traffic/Safety/Infrastructure intelligence screens.
// Grouped in one service because they all represent "what was detected and
// needs review", as opposed to fleetService (who observed it).
export const issueService = {
  listIssues(): Promise<Issue[]> {
    return mockAsync(mockIssues);
  },

  getIssueById(issueId: string): Promise<Issue | undefined> {
    return mockAsync(mockIssues.find((issue) => issue.issueId === issueId));
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
        infrastructureIssues: mockInfrastructureIssues,
      }),
    );
  },
};
