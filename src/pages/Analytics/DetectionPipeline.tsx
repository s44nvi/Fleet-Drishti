import { ArrowRight, BadgeCheck, ClipboardList, Filter, ScanEye, TriangleAlert, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { AnalyticsSnapshot } from "../../services/analyticsService";
import { cn } from "../../lib/cn";

interface Stage {
  key: string;
  label: string;
  detail: string;
  value: number;
  icon: LucideIcon;
  /** Tailwind classes for the stage glyph. */
  tint: string;
  href?: string;
}

// Detection → action: how raw edge-AI inferences are narrowed into issues a
// department must act on. Every number is the fixture pipeline itself.
// The ribbon below the stages is drawn to scale (height ∝ count).
export function DetectionPipeline({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const stages: Stage[] = [
    { key: "raw", label: "Raw detections", detail: "Frame-level model output", value: snapshot.rawDetections, icon: ScanEye, tint: "bg-surface-2 text-ink-2", href: "/live-ai" },
    { key: "validated", label: "Validated observations", detail: "Passed tracking & filtering", value: snapshot.validatedObservations, icon: Filter, tint: "bg-action-soft text-action" },
    { key: "corroborated", label: "Corroborated", detail: "Seen by 2+ buses", value: snapshot.corroboratedObservations, icon: BadgeCheck, tint: "bg-ok-soft text-ok-ink" },
    { key: "issues", label: "Issues created", detail: "Fused, deduplicated", value: snapshot.issuesCreated, icon: TriangleAlert, tint: "bg-watch-soft text-watch-ink", href: "/road-issues" },
    { key: "action", label: "Action required", detail: "Awaiting a department", value: snapshot.actionRequired, icon: ClipboardList, tint: "bg-alert-soft text-alert-ink", href: "/priority-queue" },
  ];
  const raw = Math.max(1, snapshot.rawDetections);

  // Ribbon geometry in a 1000×80 box: one plateau per stage, eased joins.
  const W = 1000;
  const Hh = 80;
  const seg = W / stages.length;
  const half = (v: number) => Math.max(3, (v / raw) * (Hh / 2 - 2));
  const topPts = stages.map((s, i) => ({ x0: i * seg + seg * 0.18, x1: (i + 1) * seg - seg * 0.18, h: half(s.value) }));
  let top = `M0,${Hh / 2 - topPts[0].h}`;
  // Top half, closed along the centre line; mirrored below for the bottom.
  const halfShape = `${top} L${W},${Hh / 2} L0,${Hh / 2} Z`;

  return (
    <div className="flex flex-col gap-2">
      <ol className="grid grid-cols-1 sm:grid-cols-5 gap-y-3" aria-label="Detection to action pipeline">
        {stages.map((s, i) => {
          const pctOfRaw = Math.round((s.value / raw) * 100);
          const prev = stages[i - 1];
          const step = prev && prev.value ? Math.round((s.value / prev.value) * 100) : null;
          const Icon = s.icon;
          const body = (
            <>
              <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", s.tint)} aria-hidden="true">
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="mt-3 block text-[34px] leading-9 font-extrabold tracking-tight text-ink tabular-nums">{s.value}</span>
              <span className="mt-1 block text-item text-ink">{s.label}</span>
              <span className="block text-meta text-ink-3">{s.detail}</span>
            </>
          );
          return (
            <li key={s.key} className="relative flex sm:flex-col gap-4 sm:gap-0 items-start sm:px-4 first:sm:pl-0">
              {i > 0 && (
                <span className="hidden sm:flex absolute -left-3 top-2.5 h-5 w-6 items-center justify-center text-ink-3" aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                {s.href ? (
                  <Link to={s.href} className="group block rounded-lg -m-1 p-1 hover:bg-surface-2 transition-colors duration-150">
                    {body}
                  </Link>
                ) : (
                  body
                )}
                <p className="mt-2 text-meta text-ink-2 tabular-nums">
                  <span className="font-bold text-ink">{pctOfRaw}%</span> of raw
                  {step !== null && <span className="text-ink-3"> · {step}% of previous</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <svg viewBox={`0 0 ${W} ${Hh}`} preserveAspectRatio="none" className="hidden sm:block mt-3 h-16 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="fd-pipe" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#cbd3de" />
            <stop offset="0.3" stopColor="#1d5fe0" />
            <stop offset="0.55" stopColor="#16a34a" />
            <stop offset="0.78" stopColor="#e08a00" />
            <stop offset="1" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        {[undefined, `translate(0 ${Hh}) scale(1 -1)`].map((transform) => (
          <g key={transform ?? "top"} transform={transform}>
            <path d={halfShape} fill="url(#fd-pipe)" fillOpacity="0.2" />
            <path d={top} fill="none" stroke="url(#fd-pipe)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
    </div>
  );
}
