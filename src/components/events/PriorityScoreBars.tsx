import type { PriorityBreakdown } from "../../lib/priorityScore";

// Explainable priority: one score, five factor bars. The weighting is a
// UI-layer demo model (lib/priorityScore.ts), so callers badge it DEMO.
export function PriorityScoreBars({ breakdown }: { breakdown: PriorityBreakdown }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-kpi text-ink tabular-nums">{breakdown.score}</span>
        <span className="text-meta text-ink-3">/ 100</span>
      </div>
      <ul className="flex flex-col gap-2" aria-label="Priority factors">
        {breakdown.factors.map((factor) => (
          <li key={factor.key} className="grid grid-cols-[84px_1fr_28px] items-center gap-2">
            <span className="text-meta text-ink-2">{factor.label}</span>
            <span className="h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
              <span className="block h-full rounded-full bg-action" style={{ width: `${factor.value}%` }} />
            </span>
            <span className="text-meta text-ink-2 tabular-nums text-right">{factor.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
