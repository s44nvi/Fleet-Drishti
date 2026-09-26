import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bus, Construction } from "lucide-react";
import { ButtonLink, EmptyState, FilterChips, PageHeader, Panel, SeverityBadge, SourceBadge, StatusBadge } from "../../components/ui";
import { ObservationRow } from "../../components/events";
import { GISMap, MapDrawer } from "../../components/gis";
import { DetectionPlayer, DetectionThumb } from "../../components/ai";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, issueService, mediaService, routeService } from "../../services";
import { groupEventsIntoIntelligence } from "../../lib/intelligenceGrouping";
import { ROAD_ISSUE_CATEGORIES, isRoadDomainType, roadIssueCategoryForSubtype, type RoadIssueCategory } from "../../lib/taxonomy";
import { issueMarker, observationGroupMarker } from "../../lib/mapMarkers";
import { ISSUE_STATUS } from "../../lib/status";
import { categoryVisual } from "../../lib/visuals";
import { datasetAnchor } from "../../lib/pulse";
import { formatMinutesAgo, minutesAgo } from "../../lib/timeAgo";
import type { IssueStatus, MapMarker, Severity } from "../../types";

type CategoryFilter = "All" | RoadIssueCategory;

// One list item per real-world road problem: either a fused, multi-bus Issue
// or a not-yet-corroborated observation group (same grouping the Command
// Center uses — lib/intelligenceGrouping.ts).
interface RoadItem {
  id: string;
  fused: boolean;
  subtype: string;
  location: string;
  severity: Severity;
  status?: IssueStatus;
  busIds: string[];
  eventIds: string[];
  confidences: number[];
  firstSeen: string;
  lastSeen: string;
  href: string;
  marker: MapMarker;
}

// Road Issues: "What's wrong with the roads?"
// Evidence-first list ↔ map split. Selecting a row flies the map to it and
// opens its evidence in a drawer; selecting a marker selects the row.
export function RoadIssues() {
  const { data: issues, loading } = useAsyncData(() => issueService.listIssues(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const { data: clips } = useAsyncData(() => mediaService.listDetectionClips(), []);
  const { data: cameras } = useAsyncData(() => fleetService.listCameras(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);
  const { data: networkStops } = useAsyncData(() => routeService.listNetworkStops(), []);

  const [category, setCategory] = useState<CategoryFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const anchor = useMemo(() => datasetAnchor((events ?? []).map((e) => e.timestamp)), [events]);

  const items = useMemo<RoadItem[]>(() => {
    const roadIssues = (issues ?? []).filter((issue) => isRoadDomainType(issue.type));
    const roadEvents = (events ?? []).filter((event) => isRoadDomainType(event.eventType));
    const issueIds = new Set(roadIssues.map((i) => i.issueId));
    const confidencesFor = (ids: string[]) =>
      roadEvents
        .filter((e) => ids.includes(e.eventId))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((e) => e.confidence);

    const fused: RoadItem[] = roadIssues.map((issue) => ({
      id: issue.issueId,
      fused: true,
      subtype: issue.subtype,
      location: issue.location,
      severity: issue.severity,
      status: issue.status,
      busIds: issue.observingBuses,
      eventIds: issue.relatedEventIds,
      confidences: confidencesFor(issue.relatedEventIds),
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      href: `/road-issues/${issue.issueId}`,
      marker: issueMarker(issue, anchor),
    }));
    const pending: RoadItem[] = groupEventsIntoIntelligence(roadEvents, roadIssues)
      .filter((group) => !issueIds.has(group.key))
      .map((group) => ({
        id: group.key,
        fused: false,
        subtype: group.subtype,
        location: group.location,
        severity: group.severity,
        busIds: group.busIds,
        eventIds: group.eventIds,
        confidences: group.confidenceSequence,
        firstSeen: group.firstDetected,
        lastSeen: group.lastObserved,
        href: group.linkTo,
        marker: observationGroupMarker(group, anchor),
      }));
    return [...fused, ...pending].sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }, [issues, events, anchor]);

  const counts = useMemo(() => {
    const map = new Map<CategoryFilter, number>([["All", items.length]]);
    for (const item of items) {
      const bucket = roadIssueCategoryForSubtype(item.subtype);
      map.set(bucket, (map.get(bucket) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const visible = category === "All" ? items : items.filter((i) => roadIssueCategoryForSubtype(i.subtype) === category);
  const selected = items.find((i) => i.id === selectedId);
  const selectedClips = (clips ?? []).filter((c) => c.eventId && selected?.eventIds.includes(c.eventId));
  const corroborated = items.filter((i) => i.busIds.length > 1).length;
  const routeNames = Object.fromEntries((routes ?? []).map((r) => [r.routeId, `${r.origin} → ${r.destination}`]));

  function select(id: string | null) {
    setSelectedId(id);
    if (id) document.getElementById(`road-item-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function latestClip(item: RoadItem) {
    return (clips ?? []).find((c) => c.eventId === item.eventIds[item.eventIds.length - 1]) ?? (clips ?? []).find((c) => c.eventId && item.eventIds.includes(c.eventId));
  }

  return (
    <>
      <PageHeader
        title="Road Issues"
        subtitle="Track road defects and infrastructure observations detected across the fleet."
        banner
        context={
          <>
            <span className="tabular-nums">
              {items.length} open · {corroborated} corroborated by 2+ buses
            </span>
            <SourceBadge source="simulated" />
          </>
        }
      />

      <FilterChips categories={ROAD_ISSUE_CATEGORIES} active={category} onChange={setCategory} counts={counts} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:h-[calc(100dvh-19rem)] xl:min-h-[560px]">
        <Panel as="section" className="xl:col-span-5 flex flex-col min-h-0" aria-label="Road issues">
          {loading ? (
            <p className="p-6 text-body text-ink-3">Loading road issues…</p>
          ) : visible.length === 0 ? (
            <EmptyState icon={Construction} title="Nothing in this category" hint="New detections appear here once a bus reports them." />
          ) : (
            <ul className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5">
              {visible.map((item) => (
                <li key={item.id}>
                  <ObservationRow
                    id={`road-item-${item.id}`}
                    category={item.subtype}
                    thumbnail={<DetectionThumb clip={latestClip(item)} />}
                    title={
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {categoryVisual(item.subtype).label}
                        {!item.fused && <StatusBadge tone="neutral">Awaiting corroboration</StatusBadge>}
                      </span>
                    }
                    meta={
                      <>
                        <span className="truncate max-w-[26ch]">{item.location}</span>
                        <span className="inline-flex items-center gap-1">
                          <Bus size={12} aria-hidden="true" />
                          {item.busIds.length}
                        </span>
                        {item.status && <span>{ISSUE_STATUS[item.status].label}</span>}
                      </>
                    }
                    aside={
                      <>
                        <SeverityBadge severity={item.severity} />
                        <span className="tabular-nums">{formatMinutesAgo(minutesAgo(item.lastSeen, anchor))}</span>
                      </>
                    }
                    selected={item.id === selectedId}
                    onSelect={() => select(item.id === selectedId ? null : item.id)}
                    onHover={(h) => setHoveredId(h ? item.id : null)}
                    href={item.fused ? item.href : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <GISMap
          className="xl:col-span-7 h-[480px] xl:h-full"
          ariaLabel="Road issue locations"
          markers={visible.map((i) => i.marker)}
          routeLines={networkRouteLines ?? []}
          stops={networkStops ?? []}
          initialShowRoutes={false}
          initialShowStops={false}
          selectedId={selectedId}
          drawerOpen={Boolean(selectedId)}
          hoveredId={hoveredId}
          onSelect={select}
          fitToMarkers
          overlay={
            selected && (
              <MapDrawer title={categoryVisual(selected.subtype).label} onClose={() => setSelectedId(null)}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={selected.severity} />
                    {selected.status ? (
                      <StatusBadge tone={ISSUE_STATUS[selected.status].tone}>{ISSUE_STATUS[selected.status].label}</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Awaiting corroboration</StatusBadge>
                    )}
                  </div>
                  <p className="text-body text-ink-2 -mt-2">{selected.location}</p>
                  <DetectionPlayer clips={selectedClips} routeNames={routeNames} cameras={cameras ?? []} />
                  <dl className="grid grid-cols-2 gap-3 text-meta">
                    <div>
                      <dt className="text-ink-3">First seen</dt>
                      <dd className="text-item text-ink tabular-nums">{formatMinutesAgo(minutesAgo(selected.firstSeen, anchor))}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-3">Confidence</dt>
                      <dd className="text-item text-ink tabular-nums">{selected.confidences.map((c) => `${c}%`).join(" → ")}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.busIds.map((busId) => (
                      <Link
                        key={busId}
                        to={`/fleet/${busId}`}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-line text-meta text-ink-2 hover:border-action hover:text-action"
                      >
                        <Bus size={12} aria-hidden="true" />
                        {busId}
                      </Link>
                    ))}
                  </div>
                  {selected.fused && (
                    <ButtonLink to={selected.href} variant="primary" className="w-full">
                      Open issue
                    </ButtonLink>
                  )}
                </div>
              </MapDrawer>
            )
          }
        />
      </section>
    </>
  );
}
