import type { InfrastructureIssue } from "../../types";

export const mockInfrastructureIssues: InfrastructureIssue[] = [
  { infrastructureIssueId: "INF-001", assetType: "streetlight", condition: "damaged", location: "BKC / Kurla", latitude: 19.0662, longitude: 72.8686, severity: "medium", observedAt: "2026-09-12T09:58:10+05:30", status: "new" },
  { infrastructureIssueId: "INF-002", assetType: "drainage", condition: "degraded", location: "Dadar TT Circle", latitude: 19.0176, longitude: 72.8478, severity: "high", observedAt: "2026-09-12T09:41:22+05:30", status: "under-review" },
  { infrastructureIssueId: "INF-003", assetType: "signage", condition: "missing", location: "Andheri East", latitude: 19.1197, longitude: 72.8468, severity: "low", observedAt: "2026-09-12T09:22:45+05:30", status: "new" },
  { infrastructureIssueId: "INF-004", assetType: "utility-pole", condition: "obstructed", location: "Sion Circle", latitude: 19.0433, longitude: 72.8622, severity: "medium", observedAt: "2026-09-12T08:55:03+05:30", status: "action-required" },
];
