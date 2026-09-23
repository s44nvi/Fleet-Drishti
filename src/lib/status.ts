import type { Bus, Camera, IssueStatus } from "../types";
import type { Tone } from "./visuals";

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
