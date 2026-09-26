import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { ANALYTICS_CATEGORIES, type AnalyticsCategory, type ObservationPeriod } from "../../services/analyticsService";
import { CATEGORY_COLOR, fmtNum } from "./analyticsVisuals";

const SIZE = 184;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 3; // px of track between segments

// Share of the period's observations by detection category: a donut for
// the gestalt plus a ranked, labelled legend carrying the exact numbers.
export function CategoryMix({ period }: { period: ObservationPeriod | undefined }) {
  const [focus, setFocus] = useState<AnalyticsCategory | null>(null);

  const rows = useMemo(() => {
    const counts = ANALYTICS_CATEGORIES.map((category) => ({
      category,
      count: (period?.days ?? []).reduce((s, d) => s + d.byCategory[category], 0),
    }));
    const total = counts.reduce((s, c) => s + c.count, 0);
    // "Other" stays last regardless of size.
    const ranked = counts
      .filter((c) => c.category !== "Other")
      .sort((a, b) => b.count - a.count)
      .concat(counts.filter((c) => c.category === "Other"));
    const shareOf = (count: number) => (total ? count / total : 0);
    return {
      total,
      items: ranked.map((c, i) => ({
        ...c,
        share: shareOf(c.count),
        start: ranked.slice(0, i).reduce((s, prev) => s + shareOf(prev.count) * C, 0),
        length: shareOf(c.count) * C,
      })),
    };
  }, [period]);

  const focused = rows.items.find((r) => r.category === focus);

  return (
    <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Observations by category: ${rows.items.map((r) => `${r.category} ${Math.round(r.share * 100)}%`).join(", ")}`}
          className="-rotate-90"
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#f7f9fc" strokeWidth={STROKE} />
          {rows.items
            .filter((r) => r.length > 0)
            .map((r) => (
              <circle
                key={r.category}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={CATEGORY_COLOR[r.category]}
                strokeWidth={focus === r.category ? STROKE + 6 : STROKE}
                strokeDasharray={`${Math.max(0, r.length - GAP)} ${C}`}
                strokeDashoffset={-r.start}
                opacity={focus && focus !== r.category ? 0.3 : 1}
                className="transition-[opacity,stroke-width] duration-150"
              />
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
          <span className="text-[28px] leading-8 font-extrabold tracking-tight text-ink tabular-nums">
            {fmtNum(focused ? focused.count : rows.total)}
          </span>
          <span className="max-w-[110px] text-meta text-ink-3">{focused ? focused.category : "observations"}</span>
        </div>
      </div>

      <ul className="w-full flex flex-col" aria-label="Category breakdown">
        {rows.items.map((r) => (
          <li key={r.category}>
            <button
              type="button"
              onMouseEnter={() => setFocus(r.category)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(r.category)}
              onBlur={() => setFocus(null)}
              className={cn(
                "grid w-full grid-cols-[12px_1fr_auto_44px] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
                focus === r.category ? "bg-surface-2" : "hover:bg-surface-2",
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLOR[r.category] }} aria-hidden="true" />
              <span className="text-body text-ink-2 truncate">{r.category}</span>
              <span className="text-body font-semibold text-ink tabular-nums">{Math.round(r.share * 100)}%</span>
              <span className="text-meta text-ink-3 tabular-nums text-right">{fmtNum(r.count)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
