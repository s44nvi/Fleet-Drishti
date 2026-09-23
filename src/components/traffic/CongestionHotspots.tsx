import { Panel, SourceBadge } from "../ui";
import { cn } from "../../lib/cn";
import { CONGESTION_DISPLAY_LABEL, CONGESTION_TONE } from "../../lib/congestion";
import { TONE_CLASSES, TONE_HEX } from "../../lib/visuals";
import type { CongestionLevel, TrafficHotspot } from "../../types";

const LEVEL_RANK: Record<CongestionLevel, number> = { severe: 3, high: 2, medium: 1, low: 0 };

interface CongestionHotspotsProps {
  readings: TrafficHotspot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
  className?: string;
}

// Corridors ranked by their latest fleet reading (level, then speed). The
// rank is a real ordering, so it is numbered.
export function CongestionHotspots({ readings, selectedId, onSelect, onHover, className }: CongestionHotspotsProps) {
  const ranked = [...readings].sort(
    (a, b) => LEVEL_RANK[b.congestionLevel] - LEVEL_RANK[a.congestionLevel] || a.averageSpeedKph - b.averageSpeedKph,
  );

  return (
    <Panel as="section" className={cn("flex flex-col min-h-0", className)} aria-label="Congestion hotspots">
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
        <div>
          <h2 className="text-title text-ink">Congestion hotspots</h2>
          <p className="text-meta text-ink-3">Latest fleet reading per corridor</p>
        </div>
        <SourceBadge source="simulated" />
      </div>
      <ol className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {ranked.map((h, i) => {
          const tone = CONGESTION_TONE[h.congestionLevel];
          const selected = h.hotspotId === selectedId;
          return (
            <li key={h.hotspotId}>
              <button
                type="button"
                onClick={() => onSelect(h.hotspotId)}
                onMouseEnter={() => onHover?.(h.hotspotId)}
                onMouseLeave={() => onHover?.(null)}
                aria-pressed={selected}
                className={cn(
                  "w-full grid grid-cols-[28px_minmax(0,1fr)_auto_56px] items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150",
                  selected ? "bg-action-soft" : "hover:bg-surface-2",
                )}
              >
                <span
                  className="h-7 w-7 rounded-full inline-flex items-center justify-center text-meta font-bold text-white tabular-nums"
                  style={{ backgroundColor: TONE_HEX[tone] }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-item text-ink truncate">{h.corridor}</span>
                  <span className="block text-meta text-ink-3 truncate">
                    {h.location} · {h.observingBusCount} buses
                  </span>
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-micro", TONE_CLASSES[tone].soft, TONE_CLASSES[tone].ink)}>
                  {CONGESTION_DISPLAY_LABEL[h.congestionLevel]}
                </span>
                <span className="text-item text-ink tabular-nums text-right">
                  {h.averageSpeedKph}
                  <span className="text-micro text-ink-3 font-medium"> km/h</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
