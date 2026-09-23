import { IconTile } from "../ui";
import { cn } from "../../lib/cn";
import { TONE_CLASSES } from "../../lib/visuals";
import type { KpiTile as KpiTileData } from "../../types";

// Icon tile + big number + short label. No eyebrow, no caption paragraph.
export function KpiTile({ label, value, unit, sub, subTone, icon, tone = "neutral" }: KpiTileData) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 min-w-0 bg-surface">
      {icon && <IconTile icon={icon} tone={tone} size="lg" />}
      <div className="flex flex-col min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-kpi text-ink tabular-nums">{value}</span>
          {unit && <span className="text-meta text-ink-3">{unit}</span>}
        </div>
        <span className="text-meta text-ink-2 truncate">{label}</span>
        {sub && <span className={cn("text-micro truncate", subTone ? TONE_CLASSES[subTone].ink : "text-ink-3")}>{sub}</span>}
      </div>
    </div>
  );
}
