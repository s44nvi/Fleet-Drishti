import type { Severity } from "./common";
import type { Evidence } from "./evidence";

export type IssueType = "road-defect" | "infrastructure" | "safety" | "traffic-blockage" | "environmental";
export type IssueStatus = "new" | "under-review" | "action-required" | "resolved";

// A deduplicated, fused problem correlated from one or more Events observed
// by one or more buses over time — the unit that flows into the priority
// queue for government action. This is the "multi-bus observation fusion"
// output described in the product's core workflow.
export interface Issue {
  issueId: string;
  type: IssueType;
  subtype: string;
  severity: Severity;
  confidence: number;
  latitude: number;
  longitude: number;
  location: string;
  firstSeen: string;
  lastSeen: string;
  observationCount: number;
  observingBuses: string[];
  relatedEventIds: string[];
  evidence: Evidence[];
  status: IssueStatus;
}
