import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { TONE_CLASSES, type Tone } from "../../lib/visuals";

export interface BarDatum {
  label: string;
  value: number;
  tone?: Tone;
  icon?: LucideIcon;
  /** Optional right-hand annotation instead of the raw value. */
  display?: string;
}

// Horizontal bars with direct labels — the default small-multiple chart.
export function BarList({ data, max, className, ariaLabel }: { data: BarDatum[]; max?: number; className?: string; ariaLabel: string }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn("flex flex-col gap-2.5", className)} aria-label={ariaLabel}>
      {data.map((d) => {
        const Icon = d.icon;
        return (
          <li key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 text-meta text-ink-2 min-w-0">
              {Icon && <Icon size={13} className="shrink-0 text-ink-3" aria-hidden="true" />}
              <span className="truncate">{d.label}</span>
            </span>
            <span className="text-item text-ink tabular-nums text-right">{d.display ?? d.value}</span>
            <span className="col-span-2 h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
              <span
                className={cn("block h-full rounded-full", TONE_CLASSES[d.tone ?? "action"].solid)}
                style={{ width: `${d.value > 0 ? Math.max(3, (d.value / top) * 100) : 0}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
