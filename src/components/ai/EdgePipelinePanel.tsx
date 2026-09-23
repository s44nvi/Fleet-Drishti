import { StatusBadge } from "../ui";
import { PipelineStep } from "./PipelineStep";
import type { PipelineStepData } from "../../types";

interface EdgePipelinePanelProps {
  feedLabel: string;
  statusLabel: string;
  steps: PipelineStepData[];
}

export function EdgePipelinePanel({ feedLabel, statusLabel, steps }: EdgePipelinePanelProps) {
  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm flex flex-col gap-space-sm shadow-sm">
      <div className="flex items-center justify-between gap-space-xs pb-space-sm border-b border-border-slate">
        <span className="flex items-center gap-1.5 font-title-sm text-title-sm text-ink-primary font-bold">
          <span className="material-symbols-outlined text-[18px] text-primary-civic-active">videocam</span>
          Live AI Video Processing Pipeline
        </span>
        <StatusBadge tone="success">Online</StatusBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-sm">
        <div className="relative aspect-video bg-inverse-surface rounded overflow-hidden flex items-center justify-center border border-border-slate">
          <div className="absolute top-2 left-2 font-label-code text-label-code text-white/90 uppercase">
            {feedLabel} &bull; {statusLabel}
          </div>
          <span className="material-symbols-outlined text-white/30 text-[48px]">videocam</span>
        </div>

        <ol className="flex flex-col gap-1.5">
          {steps.map((step) => (
            <PipelineStep key={step.id} step={step} />
          ))}
        </ol>
      </div>
    </div>
  );
}
