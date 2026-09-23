import type { PriorityBreakdown } from "../../lib/priorityScore";

interface PriorityScoreBarsProps {
  breakdown: PriorityBreakdown;
}

// Compact visualization of the factors behind a priority score — the
// product's AHP-style prioritization made legible without exposing the
// underlying math. See lib/priorityScore.ts: this is a deterministic demo
// scoring model, not a live backend calculation.
export function PriorityScoreBars({ breakdown }: PriorityScoreBarsProps) {
  return (
    <div className="flex flex-col gap-space-xs pt-space-xs">
      <div className="flex items-center justify-between">
        <span className="font-label-eyebrow text-label-eyebrow text-ink-muted uppercase tracking-widest">Priority Score</span>
        <span className="font-title-sm text-title-sm text-ink-primary font-bold">{breakdown.score}</span>
      </div>
      <div className="flex flex-col gap-1">
        {breakdown.factors.map((factor) => (
          <div key={factor.key} className="flex items-center gap-space-sm">
            <span className="font-label-code text-label-code text-ink-muted w-[76px] shrink-0">{factor.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-surface-panel overflow-hidden">
              <div className="h-full rounded-full bg-primary-civic-active/70" style={{ width: `${factor.value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <span className="font-body-sm text-body-sm text-ink-muted italic">Demo scoring model &middot; illustrates prioritization factors</span>
    </div>
  );
}
