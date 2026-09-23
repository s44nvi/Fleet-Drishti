import { cn } from "../../lib/cn";
import { SEVERITY_LABEL, SEVERITY_TONE, TONE_CLASSES } from "../../lib/visuals";
import type { Severity } from "../../types";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

// Dot + word. Critical gets a filled pill so it stands apart from "high",
// which shares the same red tone.
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const tone = TONE_CLASSES[SEVERITY_TONE[severity]];
  if (severity === "critical") {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro bg-alert text-white", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
        {SEVERITY_LABEL[severity]}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-micro whitespace-nowrap", tone.ink, className)}>
      <span className={cn("h-2 w-2 rounded-full", tone.dot)} aria-hidden="true" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
