import type { Severity } from "./common";
import type { IssueStatus } from "./issue";

export type InfrastructureAssetType = "streetlight" | "drainage" | "barrier" | "signage" | "utility-pole";
export type InfrastructureCondition = "damaged" | "missing" | "degraded" | "obstructed";

// An asset-condition record from the infrastructure detection domain.
export interface InfrastructureIssue {
  infrastructureIssueId: string;
  assetType: InfrastructureAssetType;
  condition: InfrastructureCondition;
  location: string;
  latitude: number;
  longitude: number;
  severity: Severity;
  observedAt: string;
  status: IssueStatus;
}
