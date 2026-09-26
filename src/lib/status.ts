import type { Bus, Camera, IssueStatus } from "../types";
import { humanize, type Tone } from "./visuals";

// Shared status vocabularies — one tone/label per fixture status value so a
// bus, camera or issue status reads the same on every page.

export const BUS_STATUS: Record<Bus["status"], { label: string; tone: Tone }> = {
  active: { label: "Online", tone: "ok" },
  idle: { label: "Idle", tone: "watch" },
  offline: { label: "Offline", tone: "alert" },
  maintenance: { label: "Maintenance", tone: "neutral" },
};

export const CAMERA_STATUS: Record<Camera["status"], { label: string; tone: Tone }> = {
  online: { label: "Online", tone: "ok" },
  degraded: { label: "Degraded", tone: "watch" },
  offline: { label: "Offline", tone: "alert" },
};

export const ISSUE_STATUS: Record<IssueStatus, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "action" },
  "under-review": { label: "Under review", tone: "watch" },
  "action-required": { label: "Action required", tone: "alert" },
  resolved: { label: "Resolved", tone: "ok" },
};

// Status lanes in workflow order (Infrastructure board, Priority Queue).
export const ISSUE_STATUS_ORDER: IssueStatus[] = ["new", "under-review", "action-required", "resolved"];

// Real backend Issues currently use their own status vocabulary (e.g.
// "unresolved") that predates/differs from this frontend's fixture
// IssueStatus values above — a taxonomy question, not something to guess a
// mapping for here. This just guarantees ISSUE_STATUS lookups never throw
// on an unrecognized value; unrecognized statuses get a neutral badge
// showing the raw value instead of crashing the page.
export function issueStatusMeta(status: string): { label: string; tone: Tone } {
  return ISSUE_STATUS[status as IssueStatus] ?? { label: humanize(status), tone: "neutral" };
}
