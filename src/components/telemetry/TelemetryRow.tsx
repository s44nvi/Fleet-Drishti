import type { ReactNode } from "react";

interface TelemetryRowProps {
  label: string;
  value: ReactNode;
}

// A single label/value line for detail panels (bus/route/issue detail,
// evidence metadata, pipeline diagnostics) — the mono "field: value"
// register used throughout the Stitch reference screens.
export function TelemetryRow({ label, value }: TelemetryRowProps) {
  return (
    <div className="flex items-center justify-between gap-space-md py-1.5 border-b border-border-slate last:border-b-0">
      <span className="font-label-code text-label-code text-ink-muted uppercase tracking-wide">{label}</span>
      <span className="font-label-code text-label-code text-ink-primary font-semibold text-right">{value}</span>
    </div>
  );
}
