import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bus, CarFront, ShieldAlert } from "lucide-react";
import { EmptyState, FilterChips, IconTile, PageHeader, Panel, PanelHeader, SeverityBadge, SourceBadge } from "../../components/ui";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, issueService, routeService } from "../../services";
import { SAFETY_EVENT_CATEGORIES, safetyCategoryForType, type SafetyEventCategory } from "../../lib/taxonomy";
import { safetyMarker } from "../../lib/mapMarkers";
import { SEVERITY_TONE, categoryVisual } from "../../lib/visuals";
import { datasetAnchor } from "../../lib/pulse";
import { cn } from "../../lib/cn";
import type { Event, Issue, SafetyEvent, Severity } from "../../types";

type CategoryFilter = "All" | SafetyEventCategory;

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 0.35, medium: 0.6, high: 0.85, critical: 1 };

// A SafetyEvent and an Event with the same bus + timestamp are the same
// sighting; if that Event was fused into an Issue, the signal is corroborated.
function matchedIssue(signal: SafetyEvent, events: Event[], issues: Issue[]): Issue | undefined {
  const event = events.find((e) => e.busId === signal.busId && e.timestamp === signal.observedAt);
  return event ? issues.find((i) => i.relatedEventIds.includes(event.eventId)) : undefined;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// Safety: "Where are people and vehicles at risk?"
// A risk map (signal density weighted by severity) beside an incident
// timeline. Vehicle incidents / ANPR have no data or model yet and say so.
export function Safety() {
  const { data: safetyEvents, loading } = useAsyncData(() => issueService.listSafetyEvents(), []);
  const { data: issues } = useAsyncData(() => issueService.listIssues(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);
  const { data: networkStops } = useAsyncData(() => routeService.listNetworkStops(), []);

  const [category, setCategory] = useState<CategoryFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const all = useMemo(() => safetyEvents ?? [], [safetyEvents]);
  const anchor = useMemo(() => datasetAnchor(all.map((e) => e.observedAt)), [all]);

  const counts = useMemo(() => {
    const map = new Map<CategoryFilter, number>([["All", all.length]]);
    for (const e of all) {
      const bucket = safetyCategoryForType(e.type);
      map.set(bucket, (map.get(bucket) ?? 0) + 1);
    }
    return map;
  }, [all]);

  const visible = useMemo(
    () =>
      (category === "All" ? all : all.filter((e) => safetyCategoryForType(e.type) === category)).sort(
        (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
      ),
    [all, category],
  );

  const markers = visible.map((e) => {
    const issue = matchedIssue(e, events ?? [], issues ?? []);
    return safetyMarker(e, anchor, issue ? `/road-issues/${issue.issueId}` : undefined);
  });
  const heatPoints = visible.map((e) => ({ longitude: e.longitude, latitude: e.latitude, weight: SEVERITY_WEIGHT[e.severity] }));
  const highCount = all.filter((e) => e.severity === "high" || e.severity === "critical").length;

  function select(id: string | null) {
    setSelectedId(id);
    if (id) document.getElementById(`safety-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  return (
    <>
      <PageHeader
        title="Safety"
        subtitle="Monitor pedestrian risks, vehicle incidents, and safety observations."
        banner
        context={
          <>
            <span className="tabular-nums">
              {all.length} risk signals · {highCount} high severity
            </span>
            <SourceBadge source="simulated" />
          </>
        }
      />

      <FilterChips categories={SAFETY_EVENT_CATEGORIES} active={category} onChange={setCategory} counts={counts} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:h-[calc(100dvh-19rem)] xl:min-h-[560px]">
        <GISMap
          className="xl:col-span-7 h-[460px] xl:h-full"
          ariaLabel="Safety risk map"
          markers={markers}
          routeLines={networkRouteLines ?? []}
          stops={networkStops ?? []}
          initialShowRoutes={false}
          initialShowStops={false}
          heatmap={{ points: heatPoints, label: "Risk density" }}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={select}
          fitToMarkers
        />

        <Panel as="section" className="xl:col-span-5 flex flex-col min-h-0" aria-label="Incident timeline">
          <PanelHeader className="px-4 pt-4 pb-2" title="Incident timeline" icon={ShieldAlert} meta={`${visible.length}`} />
          {loading ? (
            <p className="p-6 text-body text-ink-3">Loading safety signals…</p>
          ) : visible.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No signals in this category" />
          ) : (
            <ol className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-1">
              {visible.map((signal, index) => {
                const visual = categoryVisual(signal.type);
                const issue = matchedIssue(signal, events ?? [], issues ?? []);
                const selected = signal.safetyEventId === selectedId;
                const last = index === visible.length - 1;
                return (
                  <li key={signal.safetyEventId} id={`safety-${signal.safetyEventId}`} className="grid grid-cols-[44px_20px_1fr] gap-x-2">
                    <time dateTime={signal.observedAt} className="text-meta text-ink-3 tabular-nums pt-3">
                      {clock(signal.observedAt)}
                    </time>
                    <div className="relative flex justify-center" aria-hidden="true">
                      {!last && <span className="absolute top-5 bottom-0 w-px bg-line" />}
                      <span className={cn("relative mt-4 h-2.5 w-2.5 rounded-full ring-4 ring-surface", selected ? "bg-action" : "bg-safety")} />
                    </div>
                    <button
                      type="button"
                      onClick={() => select(selected ? null : signal.safetyEventId)}
                      onMouseEnter={() => setHoveredId(signal.safetyEventId)}
                      onMouseLeave={() => setHoveredId(null)}
                      aria-pressed={selected}
                      className={cn(
                        "mb-1.5 min-w-0 flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                        selected ? "bg-action-soft ring-1 ring-action/30" : "hover:bg-surface-2",
                      )}
                    >
                      <IconTile icon={visual.icon} tone={SEVERITY_TONE[signal.severity] === "ok" ? "neutral" : "safety"} size="sm" />
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-item text-ink truncate">{visual.label}</span>
                          <SeverityBadge severity={signal.severity} />
                        </div>
                        <span className="text-meta text-ink-3 truncate">{signal.location}</span>
                        <span className="text-meta text-ink-3 flex flex-wrap items-center gap-x-2">
                          <span className="inline-flex items-center gap-1">
                            <Bus size={12} aria-hidden="true" />
                            {signal.busId}
                          </span>
                          <span className="tabular-nums">{signal.confidence}% confidence</span>
                        </span>
                        {issue && <span className="text-meta text-ok-ink">Corroborated · {issue.observingBuses.length} buses</span>}
                      </div>
                    </button>
                    {issue && selected && (
                      <Link
                        to={`/road-issues/${issue.issueId}`}
                        className="col-start-3 -mt-1 mb-2 ml-3 text-meta font-semibold text-action hover:text-action-strong w-fit"
                      >
                        Open issue {issue.issueId}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </section>

      <Panel as="section" className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <IconTile icon={CarFront} tone="neutral" size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-title text-ink">Vehicle incidents and ANPR</h2>
          <p className="text-meta text-ink-3">
            Rash driving, hit-and-run and plate reads appear here once the ANPR and tracking models are connected. No detections yet.
          </p>
        </div>
      </Panel>
    </>
  );
}
