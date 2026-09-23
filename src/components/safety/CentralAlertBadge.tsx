import { StatusBadge } from "../ui";
import type { Issue } from "../../types";

// PS §"securely share alerts with a central command system" — Fleet
// Drishti's Command Center/Priority Queue already is that central system
// (see Command Center's Needs Attention/Priority Issues panels, which read
// from the same Issue population this badge does). This just makes the
// share state visible on the Safety page itself, derived from the Issue's
// real `status` field — no new workflow state is introduced.
const CENTRAL_ALERT: Record<Issue["status"], { label: string; tone: "critical" | "info" | "success" }> = {
  new: { label: "Pending Review", tone: "info" },
  "under-review": { label: "Pending Review", tone: "info" },
  "action-required": { label: "Active", tone: "critical" },
  resolved: { label: "Resolved", tone: "success" },
};

export function CentralAlertBadge({ status }: { status: Issue["status"] }) {
  const alert = CENTRAL_ALERT[status];
  return <StatusBadge tone={alert.tone}>Central Alert &middot; {alert.label}</StatusBadge>;
}
