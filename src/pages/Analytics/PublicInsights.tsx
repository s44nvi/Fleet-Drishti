import { ArrowUpRight, Info, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import type { PublicCityInsight, PublicSignalKind } from "../../data/external/publicReports";
import { fmtDate } from "./analyticsVisuals";

// Source labels for external signals — deliberately NOT the SourceBadge
// vocabulary (LIVE/RECORDED/DEMO/SIMULATED), which describes fleet data.
const KIND: Record<PublicSignalKind, { label: string; className: string; note?: string }> = {
  bmc: { label: "BMC", className: "bg-action-soft text-action" },
  "traffic-police": { label: "Traffic Police", className: "bg-watch-soft text-watch-ink" },
  news: { label: "News", className: "bg-surface-2 text-ink-2 border border-line" },
  citizen: {
    label: "Citizen reports",
    className: "bg-safety-soft text-safety-ink",
    note: "Anecdotal — not verified, not sensor data",
  },
};

function KindLabel({ kind }: { kind: PublicSignalKind }) {
  const k = KIND[kind];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-micro whitespace-nowrap", k.className)}>{k.label}</span>;
}

function Byline({ insight }: { insight: PublicCityInsight }) {
  return (
    <a
      href={insight.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1 text-meta text-ink-3 hover:text-action"
    >
      {insight.publisher} · {fmtDate(insight.publishedOn)}
      <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" className="transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function CrossCheck({ insight }: { insight: PublicCityInsight }) {
  if (!insight.fleetCrossCheck) return null;
  return (
    <Link
      to={insight.fleetCrossCheck.href}
      className="inline-flex items-center gap-1.5 self-start rounded-md border border-dashed border-line-strong px-2 py-1 text-meta text-ink-2 hover:border-action hover:text-action"
    >
      <Link2 size={13} strokeWidth={2} aria-hidden="true" />
      Fleet cross-check: {insight.fleetCrossCheck.text}
    </Link>
  );
}

export function PublicInsights({ insights }: { insights: PublicCityInsight[] }) {
  if (insights.length === 0) return null;
  const [lead, ...rest] = insights;
  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-meta text-ink-2">
        <Info size={15} strokeWidth={2} className="mt-px shrink-0 text-ink-3" aria-hidden="true" />
        External context from published reporting, quoted with its source. None of this was observed by Fleet Drishti buses, and it does not
        feed the fleet figures above. Citizen accounts are anecdotal.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-8">
        {/* Lead story */}
        <article className="lg:col-span-5 flex flex-col gap-3 lg:border-r lg:border-line lg:pr-8">
          <div className="flex items-center gap-2">
            <KindLabel kind={lead.kind} />
            <span className="text-meta text-ink-3">{lead.places.join(", ")}</span>
          </div>
          {lead.figure && (
            <p className="flex items-baseline gap-3">
              <span className="text-[56px] leading-[56px] font-extrabold tracking-tight text-ink tabular-nums">{lead.figure}</span>
              <span className="text-body text-ink-2 max-w-[160px]">{lead.figureLabel}</span>
            </p>
          )}
          <h3 className="text-[22px] leading-7 font-bold tracking-tight text-ink text-balance">{lead.headline}</h3>
          <p className="text-[14px] leading-6 text-ink-2">{lead.summary}</p>
          <Byline insight={lead} />
          <CrossCheck insight={lead} />
        </article>

        {/* Remaining signals as a two-column news grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          {rest.map((insight) => (
            <article key={insight.id} className="flex flex-col gap-2 border-t border-line py-4 first:border-t-0 sm:[&:nth-child(2)]:border-t-0 first:pt-0 sm:[&:nth-child(2)]:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <KindLabel kind={insight.kind} />
                {KIND[insight.kind].note && <span className="text-micro text-safety-ink font-medium">{KIND[insight.kind].note}</span>}
              </div>
              <h3 className="text-[15px] leading-5 font-bold text-ink text-balance">
                {insight.figure && <span className="tabular-nums">{insight.figure} </span>}
                {insight.figure ? <span className="font-semibold text-ink-2">{insight.figureLabel}</span> : insight.headline}
              </h3>
              {insight.figure && <p className="text-item text-ink">{insight.headline}</p>}
              <p className="text-body text-ink-2">{insight.summary}</p>
              <Byline insight={insight} />
              <CrossCheck insight={insight} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
