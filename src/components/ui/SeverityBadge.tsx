import { cn } from "../../lib/cn";
import { humanize, SEVERITY_LABEL, SEVERITY_TONE, TONE_CLASSES } from "../../lib/visuals";
import type { Severity } from "../../types";

interface SeverityBadgeProps {
  // Real backend data can carry a legacy/unrecognized value here (e.g. an
  // old Issue row storing a raw score string like "70" from before the
  // backend bucketed severity into low/medium/high) even though this is
  // typed Severity everywhere else - widened to string so that case is
  // handled below instead of assumed away.
  severity: Severity | string;
  className?: string;
}

// Dot + word. Critical gets a filled pill so it stands apart from "high",
// which shares the same red tone. An unrecognized severity value falls
// back to a neutral badge showing the raw value, rather than throwing.
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const recognized = severity in SEVERITY_TONE;
  const tone = TONE_CLASSES[recognized ? SEVERITY_TONE[severity as Severity] : "neutral"];
  const label = recognized ? SEVERITY_LABEL[severity as Severity] : humanize(severity);

  if (severity === "critical") {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro bg-alert text-white", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-micro whitespace-nowrap", tone.ink, className)}>
      <span className={cn("h-2 w-2 rounded-full", tone.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
