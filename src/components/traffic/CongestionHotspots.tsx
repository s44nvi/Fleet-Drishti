import { Panel, SourceBadge } from "../ui";
import { cn } from "../../lib/cn";
import { CONGESTION_TONE } from "../../lib/congestion";
import { congestionColor } from "../../lib/congestionIndex";
import { TONE_CLASSES } from "../../lib/visuals";
import type { CongestionLevel } from "../../types";

export interface HotspotItem {
  id: string;
  corridor: string;
  /** "Goregaon → Kandivali" — in the direction under pressure. */
  stretch: string;
  direction: string;
  level: CongestionLevel;
  index: number;
  speedKph: number;
  /** vs the same hour's weekly average. */
  vsUsualPct: number;
}

const LEVEL_LABEL: Record<CongestionLevel, string> = { low: "Low", medium: "Moderate", high: "High", severe: "Severe" };

interface CongestionHotspotsProps {
  items: HotspotItem[];
  /** e.g. "Tue 19:00" */
  when: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
  className?: string;
}

// The most congested corridor stretches at the selected day/hour (one per
// corridor), ranked by the demo congestion index. Numbered: it is a ranking.
export function CongestionHotspots({ items, when, selectedId, onSelect, onHover, className }: CongestionHotspotsProps) {
  return (
    <Panel as="section" className={cn("flex flex-col min-h-0", className)} aria-label="Congestion hotspots">
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div>
          <h2 className="text-title text-ink">Congestion hotspots</h2>
          <p className="text-meta text-ink-3 tabular-nums">Worst stretches · {when}</p>
        </div>
        <SourceBadge source="demo" />
      </div>
      <ol className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {items.map((h, i) => {
          const tone = CONGESTION_TONE[h.level];
          const selected = h.id === selectedId;
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => onSelect(h.id)}
                onMouseEnter={() => onHover?.(h.id)}
                onMouseLeave={() => onHover?.(null)}
                aria-pressed={selected}
                className={cn(
                  "w-full grid grid-cols-[28px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150",
                  selected ? "bg-action-soft" : "hover:bg-surface-2",
                )}
              >
                <span
                  className="h-7 w-7 rounded-full inline-flex items-center justify-center text-meta font-bold text-white tabular-nums"
                  style={{ backgroundColor: congestionColor(h.index) }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-item text-ink truncate">{h.corridor}</span>
                  <span className="block text-meta text-ink-3 truncate">
                    {h.stretch} · {h.direction}
                  </span>
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-micro", TONE_CLASSES[tone].soft, TONE_CLASSES[tone].ink)}>
                  {LEVEL_LABEL[h.level]}
                </span>
                <span className="text-right whitespace-nowrap">
                  <span className="block text-item text-ink tabular-nums">
                    ~{h.speedKph}
                    <span className="text-micro text-ink-3 font-medium"> km/h</span>
                  </span>
                  <span className={cn("block text-micro tabular-nums", h.vsUsualPct > 0 ? "text-alert-ink" : "text-ok-ink")}>
                    {h.vsUsualPct > 0 ? "+" : ""}
                    {Math.round(h.vsUsualPct)}% vs avg
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="px-4 pb-3 text-micro text-ink-3">Illustrative demo model values — not live bus measurements.</p>
    </Panel>
  );
}
