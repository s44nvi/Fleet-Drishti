import { useRef, type KeyboardEvent } from "react";
import { cn } from "../../lib/cn";
import { CONGESTION_GRADIENT, DAY_LABELS, congestionColor, hourLabel } from "../../lib/congestionIndex";

interface HeatGridProps {
  /** grid[day][hour], values 0..1 */
  grid: number[][];
  day: number;
  hour: number;
  onSelect: (day: number, hour: number) => void;
  label: string;
}

// 7 × 24 day/hour grid. One roving tab stop; arrow keys move the selection,
// which also drives the map and the time panel.
export function HeatGrid({ grid, day, hour, onSelect, label }: HeatGridProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    const nextDay = (day + move[0] + 7) % 7;
    const nextHour = (hour + move[1] + 24) % 24;
    onSelect(nextDay, nextHour);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(`[data-cell="${nextDay}-${nextHour}"]`)?.focus());
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          ref={ref}
          role="grid"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="grid min-w-[420px] gap-[2px]"
          style={{ gridTemplateColumns: "32px repeat(24, minmax(0, 1fr))" }}
        >
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className={cn("text-micro text-center tabular-nums pb-1", h === hour ? "text-ink" : "text-ink-3")} aria-hidden="true">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
          {grid.map((row, d) => (
            <div key={d} role="row" className="contents">
              <span role="rowheader" className={cn("text-meta self-center", d === day ? "text-ink font-semibold" : "text-ink-3")}>
                {DAY_LABELS[d]}
              </span>
              {row.map((value, h) => {
                const selected = d === day && h === hour;
                return (
                  <button
                    key={h}
                    type="button"
                    role="gridcell"
                    data-cell={`${d}-${h}`}
                    tabIndex={selected ? 0 : -1}
                    aria-selected={selected}
                    aria-label={`${DAY_LABELS[d]} ${hourLabel(h)}, index ${Math.round(value * 100)}`}
                    title={`${DAY_LABELS[d]} ${hourLabel(h)} · ${Math.round(value * 100)}`}
                    onClick={() => onSelect(d, h)}
                    className={cn(
                      "h-[22px] rounded-[2px] transition-shadow duration-150",
                      selected ? "relative z-10 ring-2 ring-ink ring-offset-1" : "hover:ring-1 hover:ring-ink/40",
                    )}
                    style={{ backgroundColor: congestionColor(value), opacity: 0.35 + value * 0.65 }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <CongestionLegend />
    </div>
  );
}

export function CongestionLegend({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-micro text-ink-3", compact ? "w-full" : "w-60 self-end")}>
      <span>Low</span>
      <span className="h-2 flex-1 rounded-full" style={{ background: CONGESTION_GRADIENT }} aria-hidden="true" />
      <span>High</span>
    </div>
  );
}
