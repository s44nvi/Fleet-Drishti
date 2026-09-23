import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import type { BadgeTone } from "../../types";

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  pulse?: boolean;
}

// Fleet Drishti civic green is the BRAND color (logo, active nav, primary
// actions) — it must never be reused here as a generic status/event color.
// Semantic tones instead map to: critical=red, high/medium=amber-orange,
// low/success/live=neutral, info=GIS blue.
const TONE_CLASSES: Record<BadgeTone, string> = {
  critical: "bg-signal-alert/10 text-signal-alert",
  high: "bg-transit-warning/10 text-transit-warning",
  medium: "bg-transit-ochre/10 text-transit-ochre",
  low: "bg-surface-panel text-ink-secondary",
  info: "bg-gis-vector-blue/10 text-gis-vector-blue",
  live: "bg-surface-panel text-ink-secondary",
  success: "bg-surface-panel text-ink-secondary",
};

export function StatusBadge({ tone = "info", pulse = false, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-label-code text-label-code font-bold uppercase",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
