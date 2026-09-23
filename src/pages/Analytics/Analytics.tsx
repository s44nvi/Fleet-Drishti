import { useMemo } from "react";
import { BadgeCheck, CalendarDays, CircleGauge, Filter, Layers, Route as RouteIcon, ScanEye, SquareCheckBig, Workflow } from "lucide-react";
import { PageHeader, Panel, PanelHeader, SourceBadge } from "../../components/ui";
import { BarList, KpiStrip } from "../../components/telemetry";
import { useAsyncData } from "../../hooks/useAsyncData";
import { analyticsService, eventService, issueService, routeService } from "../../services";
import { DETECTION_TAXONOMY_BUCKETS, bucketForSubtype } from "../../lib/taxonomy";
import { ISSUE_STATUS, ISSUE_STATUS_ORDER } from "../../lib/status";
import type { KpiTile } from "../../types";

const KPI_VISUALS: Record<string, Pick<KpiTile, "icon" | "tone">> = {
  "open-issues": { icon: Layers, tone: "watch" },
  "resolved-issues": { icon: SquareCheckBig, tone: "ok" },
  "avg-confidence": { icon: CircleGauge, tone: "action" },
  "avg-fusion": { icon: BadgeCheck, tone: "action" },
};

// Analytics: "What patterns are emerging?"
// Small multiples over the fixture data. The weekly activity series is the
// only non-derived chart and is badged DEMO.
export function Analytics() {
  const { data: summary } = useAsyncData(() => analyticsService.getCityAnalyticsSummary(), []);
  const { data: weekly } = useAsyncData(() => analyticsService.getEventActivityTrend(), []);
  const { data: detections } = useAsyncData(() => eventService.listDetections(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const { data: issues } = useAsyncData(() => issueService.listIssues(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);

  const funnel = useMemo(() => {
    const allIssues = issues ?? [];
    return [
      { label: "Raw detections", value: detections?.length ?? 0, tone: "neutral" as const, icon: ScanEye },
      { label: "Validated observations", value: events?.length ?? 0, tone: "action" as const, icon: Filter },
      { label: "Fused issues", value: allIssues.length, tone: "action" as const, icon: Workflow },
      { label: "Needing action", value: allIssues.filter((i) => i.status === "action-required").length, tone: "alert" as const, icon: SquareCheckBig },
    ];
  }, [detections, events, issues]);

  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events ?? []) {
      const bucket = bucketForSubtype(e.subtype);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return DETECTION_TAXONOMY_BUCKETS.filter((b) => counts.get(b)).map((b) => ({ label: b, value: counts.get(b) ?? 0 }));
  }, [events]);

  const byStatus = ISSUE_STATUS_ORDER.map((status) => ({
    label: ISSUE_STATUS[status].label,
    value: (issues ?? []).filter((i) => i.status === status).length,
    tone: ISSUE_STATUS[status].tone,
  }));

  const confidences = [...(events ?? [])].map((e) => e.confidence).sort((a, b) => a - b);
  const assignedRoutes = [...(routes ?? [])]
    .filter((r) => r.assignedBusIds.length > 0)
    .sort((a, b) => b.activeBusCount - a.activeBusCount)
    .map((r) => ({ label: `${r.name} · ${r.origin} → ${r.destination}`, value: r.activeBusCount, display: `${r.activeBusCount} active` }));

  const weekMax = Math.max(1, ...(weekly ?? []).map((d) => d.count));

  return (
    <>
      <PageHeader title="Analytics" context={<SourceBadge source="simulated" />} />

      <KpiStrip tiles={(summary ?? []).map((t) => ({ ...t, ...KPI_VISUALS[t.id] }))} />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Panel as="section" className="p-4 flex flex-col gap-4">
          <PanelHeader title="Detection to action" icon={Workflow} />
          <BarList data={funnel} ariaLabel="Pipeline from raw detections to issues needing action" />
        </Panel>

        <Panel as="section" className="p-4 flex flex-col gap-4">
          <PanelHeader title="Observations by type" icon={Layers} />
          <BarList data={byType} ariaLabel="Validated observations by type" />
        </Panel>

        <Panel as="section" className="p-4 flex flex-col gap-4">
          <PanelHeader title="Issue status" icon={SquareCheckBig} />
          <BarList data={byStatus} ariaLabel="Issues by workflow status" />
        </Panel>

        <Panel as="section" className="p-4 flex flex-col gap-4">
          <PanelHeader title="Detection confidence" icon={CircleGauge} meta={`${confidences.length} observations`} />
          <div className="flex flex-col gap-2" role="img" aria-label={`Confidence of validated observations ranges from ${confidences[0] ?? 0}% to ${confidences[confidences.length - 1] ?? 0}%`}>
            <div className="relative h-10 rounded-lg bg-surface-2">
              {confidences.map((c, i) => (
                <span
                  key={i}
                  className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-action/80"
                  style={{ left: `${Math.min(100, Math.max(0, ((c - 50) / 50) * 100))}%` }}
                  title={`${c}%`}
                />
              ))}
            </div>
            <div className="flex justify-between text-micro text-ink-3 tabular-nums">
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </Panel>

        <Panel as="section" className="p-4 flex flex-col gap-4">
          <PanelHeader title="Fleet on routes" icon={RouteIcon} />
          <BarList data={assignedRoutes} ariaLabel="Active buses per BEST route" />
        </Panel>

        <Panel as="section" className="p-4 flex flex-col gap-4">
          <PanelHeader title="Weekly activity" icon={CalendarDays} actions={<SourceBadge source="demo" />} />
          <div className="flex items-end gap-2 h-28" role="img" aria-label={`Illustrative weekly observation counts: ${(weekly ?? []).map((d) => `${d.day} ${d.count}`).join(", ")}`}>
            {(weekly ?? []).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-micro text-ink-3 tabular-nums">{d.count}</span>
                <span className="w-full rounded-t-[3px] bg-line-strong" style={{ height: `${(d.count / weekMax) * 100}%` }} />
                <span className="text-micro text-ink-3">{d.day}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}
