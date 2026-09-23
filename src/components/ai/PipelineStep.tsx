import type { PipelineStepData } from "../../types";

// A single row in an edge-AI processing chain (ingest -> analyze -> detect
// -> track -> generate event -> attach metadata -> sync). Reused by the
// Command Center's pipeline panel and the Live AI screen.
export function PipelineStep({ step }: { step: PipelineStepData }) {
  return (
    <li className="flex items-center justify-between gap-space-xs border-b border-border-slate pb-1.5 last:border-b-0">
      <span className="font-body-sm text-body-sm text-ink-primary">
        {step.order}. {step.label}
      </span>
      <span
        className={`font-label-code text-label-code font-semibold ${
          step.status === "complete" ? "text-primary-civic-deep" : "text-ink-muted"
        }`}
      >
        {step.status === "complete" ? "✓" : "…"} {step.detail}
      </span>
    </li>
  );
}
