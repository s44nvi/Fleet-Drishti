import { StatusBadge } from "./StatusBadge";
import type { Severity } from "../../types";

const SEVERITY_TONE: Record<Severity, "critical" | "high" | "medium" | "low"> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

// Thin, semantic wrapper over StatusBadge for the common "show a Severity"
// case, so callers don't have to know the tone-mapping table.
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <StatusBadge tone={SEVERITY_TONE[severity]} className={className}>
      {severity}
    </StatusBadge>
  );
}
