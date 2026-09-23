import { Route as RouteIcon } from "lucide-react";
import { Panel, SourceBadge } from "../ui";
import { cn } from "../../lib/cn";
import type { RouteEstimate } from "../../lib/trafficModel";

export interface RouteRow {
  routeId: string;
  name: string;
  from: string;
  to: string;
  distanceKm: number;
  estimate: RouteEstimate;
}

function Sparkline({ values, hour, rising }: { values: number[]; hour: number; rising: boolean }) {
  const w = 84;
  const h = 26;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)] as const);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const color = rising ? "#dc2626" : "#16a34a";
  const [cx, cy] = pts[hour] ?? pts[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={color} opacity="0.08" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r="2.5" fill={color} />
    </svg>
  );
}

// Estimated travel time per BEST route at the selected day/hour, against the
// usual time for that hour. Routes and distances are real (GTFS); the times
// are DEMO estimates from the congestion pattern — no trip-time data yet.
export function RouteAnalysis({ rows, hour, className }: { rows: RouteRow[]; hour: number; className?: string }) {
  return (
    <Panel as="section" className={cn("p-4 flex flex-col gap-3", className)} aria-label="Route analysis">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-title text-ink">Route analysis</h2>
          <p className="text-meta text-ink-3">Estimated travel time vs usual for this hour</p>
        </div>
        <SourceBadge source="demo" detail="estimate" />
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const delta = Math.round(r.estimate.deltaPct);
          const rising = delta > 0;
          return (
            <li key={r.routeId} className="grid grid-cols-[18px_minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-lg border border-line px-3 py-2.5">
              <RouteIcon size={15} className="text-ink-3" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-item text-ink truncate">
                  {r.from} → {r.to}
                </span>
                <span className="block text-meta text-ink-3">
                  {r.name} · {r.distanceKm} km
                </span>
              </span>
              <span className="text-right">
                <span className="block text-item text-ink tabular-nums">{Math.round(r.estimate.minutes)} min</span>
                <span className={cn("block text-micro tabular-nums", rising ? "text-alert-ink" : "text-ok-ink")}>
                  {rising ? "+" : ""}
                  {delta}%
                </span>
              </span>
              <Sparkline values={r.estimate.trend} hour={hour} rising={rising} />
            </li>
          );
        })}
      </ul>
      <p className="text-micro text-ink-3">Real BEST route distances; times are modelled from the demo pattern, not measured trips.</p>
    </Panel>
  );
}
