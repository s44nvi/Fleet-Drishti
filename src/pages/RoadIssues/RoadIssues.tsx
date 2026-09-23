import { useMemo, useState } from "react";
import { PageHeader, Panel, PanelHeader, CategoryFilterRow } from "../../components/ui";
import { KpiStrip, DetectionDistributionChart } from "../../components/telemetry";
import { IssueCard, IntelligenceCard } from "../../components/events";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, issueService } from "../../services";
import { groupEventsIntoIntelligence } from "../../lib/intelligenceGrouping";
import { ROAD_ISSUE_CATEGORIES, isRoadDomainType, roadIssueCategoryForSubtype, type RoadIssueCategory } from "../../lib/taxonomy";
import type { MapMarker } from "../../types";

type CategoryFilter = "All" | RoadIssueCategory;

// Road Issues: the road-defect portion of SIH PS 26124 (potholes, road
// damage, waterlogging, missing dividers/zebra crossings/signboards, other
// hazards). Combines two populations, kept visually distinct throughout:
//
//  - "Road Issue" (IssueCard) — a fused, multi-bus-corroborated Issue
//  - "Live Observation" (IntelligenceCard) — a road/waterlogging Event not
//    yet fused into an Issue (single sighting, awaiting corroboration)
//
// Both are produced by the same grouping logic the Command Center uses
// (lib/intelligenceGrouping.ts) — there is no second, incompatible
// grouping system here.
export function RoadIssues() {
  const { data: issues, loading } = useAsyncData(() => issueService.listIssues(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const [category, setCategory] = useState<CategoryFilter>("All");

  const roadIssues = useMemo(() => (issues ?? []).filter((issue) => isRoadDomainType(issue.type)), [issues]);
  const roadEvents = useMemo(() => (events ?? []).filter((event) => isRoadDomainType(event.eventType)), [events]);

  const standaloneGroups = useMemo(() => {
    const issueIds = new Set(roadIssues.map((issue) => issue.issueId));
    return groupEventsIntoIntelligence(roadEvents, roadIssues).filter((group) => !issueIds.has(group.key));
  }, [roadEvents, roadIssues]);

  // --- B1: summary metrics, all derived from the two populations above ---
  const corroboratedCount =
    roadIssues.filter((issue) => issue.observationCount > 1).length +
    standaloneGroups.filter((group) => group.corroborated).length;
  const affectedLocations = new Set([
    ...roadIssues.map((issue) => issue.location),
    ...standaloneGroups.map((group) => group.location),
  ]).size;

  const summaryTiles = [
    {
      id: "active-road-observations",
      label: "Active Road Observations",
      value: String(roadIssues.length + standaloneGroups.length),
      caption: "Fused issues + live observations",
    },
    {
      id: "critical",
      label: "Critical",
      value: String(roadIssues.filter((issue) => issue.severity === "critical").length),
      caption: "Fused issues only",
    },
    {
      id: "high-priority",
      label: "High Priority",
      value: String(roadIssues.filter((issue) => issue.severity === "high").length),
      caption: "Fused issues only",
    },
    {
      id: "corroborated",
      label: "Corroborated",
      value: String(corroboratedCount),
      caption: "2+ buses observing",
    },
    {
      id: "affected-locations",
      label: "Affected Locations",
      value: String(affectedLocations),
      caption: "Unique locations tracked",
    },
  ];

  // --- B2: category filter, counted across both populations ---
  const categoryCounts = new Map<CategoryFilter, number>([["All", roadIssues.length + standaloneGroups.length]]);
  for (const issue of roadIssues) {
    const bucket = roadIssueCategoryForSubtype(issue.subtype);
    categoryCounts.set(bucket, (categoryCounts.get(bucket) ?? 0) + 1);
  }
  for (const group of standaloneGroups) {
    const bucket = roadIssueCategoryForSubtype(group.subtype);
    categoryCounts.set(bucket, (categoryCounts.get(bucket) ?? 0) + 1);
  }

  const filteredIssues =
    category === "All" ? roadIssues : roadIssues.filter((issue) => roadIssueCategoryForSubtype(issue.subtype) === category);
  const filteredGroups =
    category === "All"
      ? standaloneGroups
      : standaloneGroups.filter((group) => roadIssueCategoryForSubtype(group.subtype) === category);

  // --- B7: accumulated road-condition intelligence, by type ---
  const distributionBuckets = ROAD_ISSUE_CATEGORIES.map((bucket) => ({
    bucket,
    count: categoryCounts.get(bucket) ?? 0,
  })).filter((entry) => entry.count > 0);

  // --- B8: map markers for both populations, reusing the existing GISMap ---
  const issueMarkers: MapMarker[] = filteredIssues.map((issue) => ({
    id: issue.issueId,
    kind: "critical-distress",
    label: `${issue.issueId} · ${issue.location}`,
    latitude: issue.latitude,
    longitude: issue.longitude,
    href: `/road-issues/${issue.issueId}`,
  }));
  const observationMarkers: MapMarker[] = filteredGroups.map((group) => ({
    id: group.key,
    kind: "critical-distress",
    label: `${group.location} · ${group.subtype.replace(/-/g, " ")} (live observation)`,
    latitude: group.latitude,
    longitude: group.longitude,
    href: group.linkTo,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Road Issues"
        description="AI-powered road condition intelligence from the public transport fleet."
      />

      <KpiStrip tiles={summaryTiles} columns={5} />

      {/* B2: category filter */}
      <CategoryFilterRow categories={ROAD_ISSUE_CATEGORIES} active={category} onChange={setCategory} counts={categoryCounts} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md w-full items-start">
        {/* B3/B4: unified issue intelligence list — Road Issues (fused) first,
            then Live Observations (not yet corroborated) */}
        <div className="xl:col-span-8">
          <Panel className="p-space-sm flex flex-col gap-space-xs">
            <PanelHeader
              title="Road Issue Intelligence"
              icon="construction"
              meta={
                <span className="font-label-code text-label-code text-ink-muted">
                  {filteredIssues.length + filteredGroups.length} shown
                </span>
              }
            />
            {loading ? (
              <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading road issues…</div>
            ) : (
              <div className="flex flex-col divide-y divide-border-slate">
                {filteredIssues.map((issue) => (
                  <IssueCard key={issue.issueId} issue={issue} />
                ))}
                {filteredGroups.map((group) => (
                  <div key={group.key} className="flex flex-col gap-1">
                    <span className="font-label-eyebrow text-label-eyebrow text-ink-muted uppercase tracking-widest pt-space-xs">
                      Live Observation &middot; Not Yet Corroborated
                    </span>
                    <IntelligenceCard group={group} />
                  </div>
                ))}
                {filteredIssues.length === 0 && filteredGroups.length === 0 && (
                  <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">
                    No road issues in this category.
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* Compact spatial overview + road-condition intelligence summary */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          <div className="h-[280px]">
            <GISMap markers={[...issueMarkers, ...observationMarkers]} title="Road Issue Locations" />
          </div>
          <DetectionDistributionChart
            buckets={distributionBuckets}
            title="Road Issues by Type"
            meta="Accumulated Intelligence"
            icon="bar_chart"
            emptyLabel="No road issues recorded yet."
          />
        </div>
      </section>
    </>
  );
}
