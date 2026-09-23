import { StatusBadge } from "../ui";
import type { KpiTile as KpiTileData } from "../../types";

// Deltas are informational, not severity signals — keep them neutral/red,
// never brand green (see StatusBadge for the same rule on badges).
const DELTA_TONE_CLASSES: Record<NonNullable<KpiTileData["deltaTone"]>, string> = {
  positive: "text-ink-secondary",
  negative: "text-signal-alert",
  neutral: "text-ink-muted",
};

// A single stat column. Rendered without its own border/shadow — KpiStrip
// supplies one shared panel with hairline dividers between columns so four
// KPIs read as one instrument, not four separate cards.
// Four-line stack: eyebrow label (+ optional live/status badge) -> primary
// value with its inline qualifier -> secondary delta on its own line ->
// caption. Kept as separate rows (rather than concatenating "6 Idle" into
// one string) so the primary number is always the most prominent thing in
// the tile, per the Command Center's "answer in 5 seconds" hierarchy.
export function KpiTile({ label, value, valueLabel, badge, badgeTone = "info", delta, deltaTone = "neutral", caption }: KpiTileData) {
  return (
    <div className="flex flex-col justify-between gap-1 px-space-md py-space-sm first:pl-0 last:pr-0">
      <div className="flex items-center justify-between gap-space-xs">
        <span className="font-label-eyebrow text-label-eyebrow text-ink-muted uppercase">{label}</span>
        {badge && <StatusBadge tone={badgeTone}>{badge}</StatusBadge>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-headline-lg text-headline-lg text-ink-primary font-bold tracking-tight">{value}</span>
        {valueLabel && (
          <span className="font-body-sm text-body-sm text-ink-secondary font-semibold">{valueLabel}</span>
        )}
      </div>
      {delta && (
        <span className={`font-label-code text-label-code font-semibold ${DELTA_TONE_CLASSES[deltaTone]}`}>{delta}</span>
      )}
      <div className="font-label-code text-label-code text-ink-muted">{caption}</div>
    </div>
  );
}
