import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "../../lib/cn";
import { ANALYTICS_DOMAINS, type AnalyticsDomain, type ObservationPeriod } from "../../services/analyticsService";
import { DOMAIN_COLOR, RANGE_OPTIONS, fmtDate, fmtDay, fmtNum, useElementWidth, type RangeDays } from "./analyticsVisuals";

type Pt = [number, number];

// Monotone cubic (Fritsch–Carlson): smooth without overshooting, so a
// stacked band never bulges past the data it represents.
function monotonePath(points: Pt[], move = true): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `${move ? "M" : "L"}${points[0][0]},${points[0][1]}`;
  const dx = points.slice(1).map((p, i) => p[0] - points[i][0]);
  const slope = points.slice(1).map((p, i) => (p[1] - points[i][1]) / dx[i]);
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (2 * slope[i - 1] * slope[i]) / (slope[i - 1] + slope[i]);
  });
  let d = `${move ? "M" : "L"}${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${points[i][0] + h},${points[i][1] + tangent[i] * h} ${points[i + 1][0] - h},${points[i + 1][1] - tangent[i + 1] * h} ${points[i + 1][0]},${points[i + 1][1]}`;
  }
  return d;
}

function niceStep(max: number, ticks: number): number {
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 2.5, 5, 10].find((u) => u * pow >= raw) ?? 10;
  return unit * pow;
}

const HEIGHT = 300;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

interface ObservationTrendsProps {
  period: ObservationPeriod | undefined;
  range: RangeDays;
  onRangeChange: (days: RangeDays) => void;
}

export function ObservationTrends({ period, range, onRangeChange }: ObservationTrendsProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hidden, setHidden] = useState<Set<AnalyticsDomain>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const days = useMemo(() => period?.days ?? [], [period]);
  const visible = ANALYTICS_DOMAINS.filter((d) => !hidden.has(d));

  const chart = useMemo(() => {
    if (!width || days.length === 0) return null;
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const totals = days.map((d) => d.total);
    const step = niceStep(Math.max(...totals, 1), 4);
    const yMax = Math.ceil(Math.max(...totals, 1) / step) * step;
    const x = (i: number) => PAD.left + (days.length === 1 ? innerW / 2 : (i / (days.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

    // Cumulative stack, bottom → top, over the visible domains only.
    const layers = visible.map((domain, li) => {
      const lower = days.map((d) => visible.slice(0, li).reduce((s, v) => s + d.byDomain[v], 0));
      const upper = lower.map((l, i) => l + days[i].byDomain[domain]);
      const top: Pt[] = upper.map((v, i) => [x(i), y(v)]);
      const bottom: Pt[] = lower.map((v, i): Pt => [x(i), y(v)]).reverse();
      return { domain, d: `${monotonePath(top)}${monotonePath(bottom, false)}Z`, line: monotonePath(top) };
    });
    const totalLine = monotonePath(days.map((d, i) => [x(i), y(d.total)]));
    const yTicks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
    const tickEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(innerW / 76))));
    const xTicks = days.map((_, i) => i).filter((i) => (days.length - 1 - i) % tickEvery === 0);
    return { innerW, x, y, layers, totalLine, yTicks, xTicks };
  }, [width, days, visible]);

  const toggle = (domain: AnalyticsDomain) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else if (next.size < ANALYTICS_DOMAINS.length - 1) next.add(domain);
      return next;
    });

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    if (!chart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left - PAD.left) / chart.innerW;
    setActive(Math.min(days.length - 1, Math.max(0, Math.round(rel * (days.length - 1)))));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((i) => {
      const cur = i ?? days.length - 1;
      return Math.min(days.length - 1, Math.max(0, cur + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const total = days.reduce((s, d) => s + d.total, 0);
  const peak = days.reduce((best, d) => (d.total > (best?.total ?? -1) ? d : best), days[0]);
  const summary = days.length
    ? `Illustrative daily observations, ${fmtDate(days[0].date)} to ${fmtDate(days[days.length - 1].date)}: ${fmtNum(total)} in total, peaking at ${peak.total} on ${fmtDay(peak.date)}.`
    : "Loading observation trend";
  const activeDay = active !== null ? days[active] : null;
  const tooltipLeft = chart && active !== null ? chart.x(active) : 0;
  const flip = chart ? tooltipLeft > width - 190 : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2" role="group" aria-label="Show or hide series">
          {ANALYTICS_DOMAINS.map((domain) => {
            const on = !hidden.has(domain);
            return (
              <button
                key={domain}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(domain)}
                className={cn(
                  "inline-flex items-center gap-2 min-h-7 text-meta transition-opacity duration-150",
                  on ? "text-ink-2" : "text-ink-3 opacity-60 line-through",
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOMAIN_COLOR[domain] }} aria-hidden="true" />
                {domain}
              </button>
            );
          })}
          <span className="inline-flex items-center gap-2 text-meta text-ink-2">
            <span className="h-0.5 w-4 rounded bg-ink" aria-hidden="true" />
            Total observations
          </span>
        </div>
        <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5" role="group" aria-label="Date range">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              aria-pressed={range === opt.days}
              aria-label={opt.label}
              onClick={() => onRangeChange(opt.days)}
              className={cn(
                "h-7 min-w-11 px-2.5 rounded-md text-meta transition-colors duration-150",
                range === opt.days ? "bg-surface text-ink shadow-panel" : "text-ink-3 hover:text-ink",
              )}
            >
              {opt.short}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={ref}
        className="relative rounded-lg outline-offset-4"
        style={{ height: HEIGHT }}
        tabIndex={0}
        role="img"
        aria-label={`${summary} Use left and right arrow keys to read each day.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {chart && (
          <svg width={width} height={HEIGHT} onPointerMove={onPointer} onPointerLeave={() => setActive(null)} className="block touch-pan-y">
            {chart.yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={chart.y(t)} y2={chart.y(t)} stroke="#e3e8ef" strokeDasharray={t === 0 ? undefined : "2 4"} />
                <text x={PAD.left - 8} y={chart.y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}
            {chart.layers.map((l) => (
              <g key={l.domain}>
                <path d={l.d} fill={DOMAIN_COLOR[l.domain]} fillOpacity={0.78} />
                <path d={l.line} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1} />
              </g>
            ))}
            <path d={chart.totalLine} fill="none" stroke="#0e1a2b" strokeWidth={1.75} />
            {chart.xTicks.map((i) => (
              <text key={i} x={chart.x(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-3 text-[11px]">
                {fmtDay(days[i].date)}
              </text>
            ))}
            {activeDay && active !== null && (
              <g pointerEvents="none">
                <line x1={chart.x(active)} x2={chart.x(active)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#0e1a2b" strokeOpacity={0.5} strokeDasharray="3 3" />
                <circle cx={chart.x(active)} cy={chart.y(activeDay.total)} r={4.5} fill="#ffffff" stroke="#0e1a2b" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {activeDay && (
          <div
            className="pointer-events-none absolute top-3 z-10 w-44 rounded-lg bg-ink px-3 py-2.5 text-white shadow-float"
            style={flip ? { left: tooltipLeft - 188 } : { left: tooltipLeft + 12 }}
            aria-hidden="true"
          >
            <p className="text-meta font-semibold">{fmtDate(activeDay.date)}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {[...ANALYTICS_DOMAINS].reverse().map((d) => (
                <li key={d} className={cn("flex items-center justify-between text-meta", hidden.has(d) && "opacity-40")}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: DOMAIN_COLOR[d] }} />
                    {d}
                  </span>
                  <span className="tabular-nums">{activeDay.byDomain[d]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-white/15 pt-1.5 text-meta font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{activeDay.total}</span>
            </p>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {activeDay
          ? `${fmtDate(activeDay.date)}: ${ANALYTICS_DOMAINS.map((d) => `${d} ${activeDay.byDomain[d]}`).join(", ")}; total ${activeDay.total}.`
          : ""}
      </p>
    </div>
  );
}
