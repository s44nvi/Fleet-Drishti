import { useMemo, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bus,
  CalendarDays,
  ChartSpline,
  ChevronDown,
  Crosshair,
  Gauge,
  Layers,
  MapPin,
  Newspaper,
  PieChart,
  Route as RouteIcon,
  TriangleAlert,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, Panel, PanelHeader, SourceBadge } from "../../components/ui";
import { CONTENT_BLEED_X } from "../../components/layout";
import { useAsyncData } from "../../hooks/useAsyncData";
import { cn } from "../../lib/cn";
import { TONE_CLASSES, type Tone } from "../../lib/visuals";
import {
  ANALYTICS_AS_OF,
  ANALYTICS_DOMAINS,
  analyticsService,
  locationActivityForPeriod,
  type AnalyticsSnapshot,
  type ObservationPeriod,
} from "../../services/analyticsService";
import { ObservationTrends } from "./ObservationTrends";
import { CategoryMix } from "./CategoryMix";
import { LocationRanking } from "./LocationRanking";
import { DetectionPipeline } from "./DetectionPipeline";
import { ConfidenceCorroboration } from "./ConfidenceCorroboration";
import { FleetPerformance } from "./FleetPerformance";
import { PublicInsights } from "./PublicInsights";
import { RANGE_OPTIONS, fmtDate, fmtDay, fmtNum, pctChange, type RangeDays } from "./analyticsVisuals";

// Analytics: "What patterns are emerging, and what should we do about them?"
// An editorial reporting workspace rather than a monitoring dashboard — see
// design-system/fleet-drishti/pages/analytics.md. Three chapters, each
// honest about its source:
//   01 Urban trends      — DEMO period model (no observation history exists yet)
//   02 Fleet & pipeline  — SIMULATED fixture snapshot, aggregated
//   03 Public reports    — external published reporting, never fleet data

const VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "fleet", label: "Fleet Performance" },
  { id: "trends", label: "Urban Trends" },
  { id: "reports", label: "Reports" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

function isView(v: string | null): v is ViewId {
  return VIEWS.some((view) => view.id === v);
}
function isRange(v: number): v is RangeDays {
  return RANGE_OPTIONS.some((opt) => opt.days === v);
}

export function Analytics() {
  const [params, setParams] = useSearchParams();
  const view: ViewId = isView(params.get("view")) ? (params.get("view") as ViewId) : "overview";
  const rangeParam = Number(params.get("range"));
  const range: RangeDays = isRange(rangeParam) ? rangeParam : 30;

  const update = (key: string, value: string, fallback: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const setView = (v: ViewId) => update("view", v, "overview");
  const setRange = (d: RangeDays) => update("range", String(d), "30");

  const { data: snapshot } = useAsyncData(() => analyticsService.getAnalyticsSnapshot(), []);
  const { data: period } = useAsyncData(() => analyticsService.getObservationPeriodDemo(range), [range]);
  const { data: insights } = useAsyncData(() => analyticsService.getPublicCityInsights(), []);

  const show = (chapter: Exclude<ViewId, "overview">) => view === "overview" || view === chapter;
  const rangeLabel = RANGE_OPTIONS.find((o) => o.days === range)?.label ?? "";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        banner
        title="Analytics"
        subtitle="From fleet observations to safer, smoother and smarter cities."
        actions={
          <>
            <HeaderSelect
              id="analytics-range"
              label="Date range"
              icon={CalendarDays}
              value={String(range)}
              onChange={(v) => setRange(Number(v) as RangeDays)}
              options={RANGE_OPTIONS.map((o) => ({ value: String(o.days), label: o.label }))}
            />
            <HeaderSelect
              id="analytics-city"
              label="City"
              icon={MapPin}
              value="mumbai"
              onChange={() => undefined}
              options={[{ value: "mumbai", label: "Mumbai" }]}
              title="Mumbai is the only city in this prototype"
            />
          </>
        }
      />
      <ViewTabs view={view} onView={setView} />
      <KpiBand snapshot={snapshot} />

      <div id="analytics-panel" role="tabpanel" aria-labelledby={`analytics-tab-${view}`} className="flex flex-col gap-14 pt-8 pb-4">
        {show("trends") && (
          <Chapter
            index="01"
            id="trends"
            title="Urban trends"
            dek={`How fleet observations moved across Mumbai · ${rangeLabel.toLowerCase()} to ${fmtDate(ANALYTICS_AS_OF)}`}
            source={<SourceBadge source="demo" detail="Illustrative period model" />}
          >
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <Panel as="section" className="xl:col-span-8 p-5 sm:p-6 flex flex-col gap-5">
                <PanelHeader title="Observation trends" icon={ChartSpline} level={3} meta="Daily observations by domain" />
                <ObservationTrends period={period} range={range} onRangeChange={setRange} />
              </Panel>
              <Panel as="section" className="xl:col-span-4 p-5 sm:p-6 flex flex-col gap-5">
                <PanelHeader title="Detections by category" icon={PieChart} level={3} />
                <CategoryMix period={period} />
              </Panel>
              <Panel as="section" className="xl:col-span-7 p-5 sm:p-6 flex flex-col gap-5">
                <PanelHeader title="Most active locations" icon={MapPin} level={3} meta="Ranked by observations" />
                <LocationRanking locations={period ? locationActivityForPeriod(period) : []} />
              </Panel>
              <PeriodReadout period={period} rangeLabel={rangeLabel} className="xl:col-span-5" />
            </div>
          </Chapter>
        )}

        {show("fleet") && (
          <Chapter
            index={view === "overview" ? "02" : "01"}
            id="fleet"
            title="Fleet & pipeline"
            dek={`From raw AI detections to actionable issues · fleet snapshot, ${fmtDate(ANALYTICS_AS_OF)}`}
            source={<SourceBadge source="simulated" detail="Fixture snapshot" />}
          >
            {snapshot ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <Panel as="section" className="xl:col-span-12 p-5 sm:p-6 flex flex-col gap-6">
                  <PanelHeader title="Detection → action pipeline" icon={Workflow} level={3} meta="How detections become work orders" />
                  <DetectionPipeline snapshot={snapshot} />
                </Panel>
                <Panel as="section" className="xl:col-span-5 p-5 sm:p-6 flex flex-col gap-5">
                  <PanelHeader title="Confidence & corroboration" icon={Crosshair} level={3} meta="How reliable is what we saw?" />
                  <ConfidenceCorroboration snapshot={snapshot} />
                </Panel>
                <Panel as="section" className="xl:col-span-7 p-5 sm:p-6 flex flex-col gap-5">
                  <PanelHeader title="Fleet performance" icon={Bus} level={3} meta="Contribution by bus and route" />
                  <FleetPerformance fleet={snapshot.fleet} />
                </Panel>
              </div>
            ) : (
              <Skeleton className="h-72" />
            )}
          </Chapter>
        )}

        {show("reports") && (
          <Chapter
            index={view === "overview" ? "03" : "01"}
            id="reports"
            title="Insights from public reports & city trends"
            dek="What civic bodies, the traffic police, the press and residents are reporting — outside the fleet"
            source={
              <span className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] leading-[14px] font-bold tracking-[0.06em] text-ink-2">
                <Newspaper size={11} strokeWidth={2.25} aria-hidden="true" />
                EXTERNAL
              </span>
            }
            band
          >
            <PublicInsights insights={insights ?? []} />
          </Chapter>
        )}
      </div>
    </div>
  );
}

// --- View tabs ---------------------------------------------------------------
// Overview / Fleet Performance / Urban Trends / Reports, directly under the
// shared page header (the header itself carries only the page controls).

function ViewTabs({ view, onView }: { view: ViewId; onView: (v: ViewId) => void }) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? VIEWS.length - 1 : (index + delta + VIEWS.length) % VIEWS.length;
    onView(VIEWS[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Analytics views" className="flex flex-wrap gap-2">
      {VIEWS.map((v, i) => {
        const selected = view === v.id;
        return (
          <button
            key={v.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`analytics-tab-${v.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="analytics-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onView(v.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={cn(
              "h-9 rounded-full border px-4 text-item transition-colors duration-150",
              selected ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
            )}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

// Page control for the banner header (white field on the photo).
function HeaderSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  options,
  title,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  title?: string;
}) {
  return (
    <div className="relative" title={title}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden="true" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-lg border border-white/60 bg-white pl-9 pr-9 text-item text-ink shadow-float focus-visible:outline-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
    </div>
  );
}

// --- KPI band ----------------------------------------------------------------
// Supporting context, not the point of the page: one quiet strip split by
// hairlines instead of five separate cards.

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  icon: LucideIcon;
  tone: Tone;
}

function KpiBand({ snapshot }: { snapshot: AnalyticsSnapshot | undefined }) {
  const kpis: Kpi[] = snapshot
    ? [
        { label: "Active issues", value: String(snapshot.activeIssues), sub: `${snapshot.actionRequired} need action`, icon: TriangleAlert, tone: "alert" },
        { label: "Total observations", value: fmtNum(snapshot.validatedObservations), sub: `from ${snapshot.rawDetections} raw detections`, icon: Layers, tone: "action" },
        { label: "Avg. detection confidence", value: `${snapshot.avgConfidence}%`, sub: "across validated observations", icon: Gauge, tone: "ok" },
        { label: "Buses contributing", value: String(snapshot.busesContributing), unit: `/ ${snapshot.fleetSize}`, sub: "sensing buses in fleet", icon: Bus, tone: "watch" },
        { label: "Routes covered", value: String(snapshot.routesCovered), unit: `/ ${snapshot.routesTotal}`, sub: "BEST routes with sensing buses", icon: RouteIcon, tone: "neutral" },
      ]
    : [];

  return (
    <section aria-label="Fleet snapshot summary" className="rounded-2xl border border-line bg-surface shadow-panel">
      {snapshot ? (
        <ul className="grid grid-cols-2 sm:grid-cols-6 xl:grid-cols-5 gap-px overflow-hidden rounded-t-2xl bg-line">
          {kpis.map((k, i) => {
            const t = TONE_CLASSES[k.tone];
            return (
              <li
                key={k.label}
                className={cn(
                  "flex flex-col sm:flex-row items-start gap-2 sm:gap-3 bg-surface px-4 py-4 sm:px-5 sm:py-5 xl:col-span-1",
                  i < 3 ? "sm:col-span-2" : "sm:col-span-3",
                  i === 4 && "col-span-2",
                )}
              >
                <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", t.soft, t.ink)} aria-hidden="true">
                  <k.icon size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-kpi text-ink tabular-nums">
                    {k.value}
                    {k.unit && <span className="ml-1 text-[15px] font-semibold text-ink-3">{k.unit}</span>}
                  </p>
                  <p className="text-item text-ink-2">{k.label}</p>
                  <p className="text-meta text-ink-3">{k.sub}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="h-[92px]" />
      )}
      <p className="flex items-center justify-end gap-2 border-t border-line px-5 py-2 text-meta text-ink-3">
        Fleet snapshot · {fmtDate(ANALYTICS_AS_OF)}
        <SourceBadge source="simulated" />
      </p>
    </section>
  );
}

// --- Chapters ---------------------------------------------------------------

function Chapter({
  index,
  id,
  title,
  dek,
  source,
  band,
  children,
}: {
  index: string;
  id: string;
  title: string;
  dek: string;
  source: ReactNode;
  /** Full-bleed white band — used to set external content apart. */
  band?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`chapter-${id}`}
      className={cn("flex flex-col gap-6", band && cn(CONTENT_BLEED_X, "-mb-4 border-t border-line bg-surface px-4 sm:px-6 lg:px-8 py-10"))}
    >
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-t-2 border-ink pt-4">
        <div className="flex items-baseline gap-4">
          <span className="text-[13px] font-bold text-ink-3 tabular-nums" aria-hidden="true">
            {index}
          </span>
          <div>
            <h2 id={`chapter-${id}`} className="text-[26px] leading-8 font-extrabold tracking-[-0.02em] text-ink text-balance">
              {title}
            </h2>
            <p className="mt-1 text-body text-ink-2">{dek}</p>
          </div>
        </div>
        <div className="shrink-0 pl-8 sm:pl-0">{source}</div>
      </header>
      {children}
    </section>
  );
}

// --- Period readout -----------------------------------------------------------
// The "so what" of chapter 01, computed from the same period series: plain
// statements with the number first. No box — it reads as commentary.

function PeriodReadout({ period, rangeLabel, className }: { period: ObservationPeriod | undefined; rangeLabel: string; className?: string }) {
  const lines = useMemo(() => {
    if (!period || period.days.length === 0) return [];
    const sum = (days: ObservationPeriod["days"], pick: (d: ObservationPeriod["days"][number]) => number) =>
      days.reduce((s, d) => s + pick(d), 0);
    const total = sum(period.days, (d) => d.total);
    const prevTotal = sum(period.previous, (d) => d.total);
    const change = pctChange(total, prevTotal);

    const domainChanges = ANALYTICS_DOMAINS.map((domain) => ({
      domain,
      change: pctChange(sum(period.days, (d) => d.byDomain[domain]), sum(period.previous, (d) => d.byDomain[domain])) ?? 0,
    })).sort((a, b) => b.change - a.change);
    const riser = domainChanges[0];

    const peak = period.days.reduce((best, d) => (d.total > best.total ? d : best), period.days[0]);

    const isWeekend = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay());
    const weekday = period.days.filter((d) => !isWeekend(d.date));
    const weekend = period.days.filter((d) => isWeekend(d.date));
    const avg = (days: ObservationPeriod["days"]) => (days.length ? sum(days, (d) => d.byDomain.Traffic) / days.length : 0);
    const ratio = avg(weekend) ? avg(weekday) / avg(weekend) : null;

    const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)}%`;
    const period_ = rangeLabel.replace("Last ", "previous ");
    return [
      { figure: change === null ? "—" : signed(change), text: `observations vs the ${period_} (${fmtNum(total)} vs ${fmtNum(prevTotal)})` },
      { figure: signed(riser.change), text: `${riser.domain} — the fastest-moving domain this period` },
      { figure: String(peak.total), text: `observations on the busiest day, ${fmtDay(peak.date)}` },
      ...(ratio ? [{ figure: `${ratio.toFixed(1)}×`, text: "more traffic observations on weekdays than weekends" }] : []),
    ];
  }, [period, rangeLabel]);

  return (
    <section aria-labelledby="h-readout" className={cn("flex flex-col gap-4 px-1 xl:pl-4", className)}>
      <div className="flex items-center gap-2">
        <Crosshair size={18} strokeWidth={1.75} className="text-ink-2" aria-hidden="true" />
        <h3 id="h-readout" className="text-title text-ink">
          What the period shows
        </h3>
      </div>
      {lines.length === 0 ? (
        <Skeleton className="h-48" />
      ) : (
        <ul className="flex flex-col">
          {lines.map((l) => (
            <li key={l.text} className="grid grid-cols-[96px_1fr] items-baseline gap-4 border-b border-line py-4 first:pt-1 last:border-0">
              <span className="text-[30px] leading-9 font-extrabold tracking-tight text-ink tabular-nums">{l.figure}</span>
              <span className="text-[14px] leading-6 text-ink-2">{l.text}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-meta text-ink-3">Computed from the illustrative period model above — a demonstration of the readout, not a finding.</p>
    </section>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-xl bg-surface-2 motion-safe:animate-pulse", className)} aria-hidden="true" />;
}
