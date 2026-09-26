import { useMemo, useState } from "react";
import { FilterChips } from "../../components/ui";
import { cn } from "../../lib/cn";
import { ANALYTICS_DOMAINS, type AnalyticsDomain, type LocationActivity } from "../../services/analyticsService";
import { DOMAIN_COLOR, fmtNum } from "./analyticsVisuals";

const SHOWN = 6;

// Ranked corridors/junctions by observation volume — a list, not a map
// (Traffic owns the geographic view). Under "All" each bar is split by
// domain so the ranking also shows *what kind* of activity drives it.
export function LocationRanking({ locations }: { locations: LocationActivity[] }) {
  const [filter, setFilter] = useState<"All" | AnalyticsDomain>("All");

  const counts = useMemo(() => {
    const m = new Map<"All" | AnalyticsDomain, number>([["All", locations.reduce((s, l) => s + l.total, 0)]]);
    for (const d of ANALYTICS_DOMAINS) m.set(d, locations.reduce((s, l) => s + l.byDomain[d], 0));
    return m;
  }, [locations]);

  const ranked = useMemo(() => {
    const value = (l: LocationActivity) => (filter === "All" ? l.total : l.byDomain[filter]);
    return [...locations].sort((a, b) => value(b) - value(a)).slice(0, SHOWN).map((l) => ({ ...l, value: value(l) }));
  }, [locations, filter]);
  const max = Math.max(1, ...ranked.map((r) => r.value));

  return (
    <div className="flex flex-col gap-4">
      <FilterChips categories={ANALYTICS_DOMAINS} active={filter} onChange={setFilter} counts={counts} />
      <ol className="flex flex-col" aria-label={`Most active locations, ${filter === "All" ? "all domains" : filter}`}>
        {ranked.map((loc, i) => (
          <li key={loc.id} className="grid grid-cols-[28px_minmax(0,1fr)_48px] sm:grid-cols-[28px_minmax(0,200px)_minmax(0,1fr)_48px] items-center gap-x-3 gap-y-1.5 py-2.5 border-b border-line last:border-0">
            <span
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full text-meta font-bold tabular-nums",
                i === 0 ? "bg-ink text-white" : "bg-surface-2 text-ink-2 border border-line",
              )}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-item text-ink truncate">{loc.name}</p>
              <p className="text-meta text-ink-3 truncate">{loc.stretch}</p>
            </div>
            <div className="order-4 sm:order-3 col-start-2 col-span-2 sm:col-start-auto sm:col-span-1 flex h-2 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div className="flex h-full" style={{ width: `${(loc.value / max) * 100}%` }}>
                {(filter === "All" ? ANALYTICS_DOMAINS : [filter]).map((d) => (
                  <span
                    key={d}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${loc.value ? (loc.byDomain[d] / loc.value) * 100 : 0}%`, background: DOMAIN_COLOR[d] }}
                  />
                ))}
              </div>
            </div>
            <span className="order-3 sm:order-4 text-item text-ink tabular-nums text-right">
              <span className="sr-only">{loc.name}: </span>
              {fmtNum(loc.value)}
            </span>
          </li>
        ))}
      </ol>
      {filter === "All" && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink-3" aria-hidden="true">
          {ANALYTICS_DOMAINS.map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: DOMAIN_COLOR[d] }} />
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
