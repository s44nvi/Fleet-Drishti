import { useState } from "react";
import { PageHeader, Panel, PanelHeader, CategoryFilterRow, SeverityBadge } from "../../components/ui";
import { KpiStrip, DetectionDistributionChart } from "../../components/telemetry";
import { InfrastructureIssueCard } from "../../components/infrastructure";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { issueService } from "../../services";
import { INFRASTRUCTURE_CATEGORIES, infrastructureCategoryForAssetType, type InfrastructureCategory } from "../../lib/taxonomy";
import type { MapMarker } from "../../types";

type CategoryFilter = "All" | InfrastructureCategory;

// Infrastructure Intelligence: PS §"infrastructure deficiencies" (missing
// dividers, faded zebra crossings, damaged/missing signboards, road
// damage). Backed entirely by the InfrastructureIssue fixture domain — a
// real but separate asset-condition registry (see lib/taxonomy.ts's
// INFRASTRUCTURE_CATEGORIES doc comment for why it isn't the same
// population as Road Issues' identically-named categories). Every record
// here is a single observation: this domain has no confidence/observation-
// count/observing-buses fields and no path through the Event/Issue
// corroboration pipeline yet, so "Corroborated" is honestly 0 rather than
// borrowed from another domain.
export function Infrastructure() {
  const { data: items, loading } = useAsyncData(() => issueService.listInfrastructureIssues(), []);
  const [category, setCategory] = useState<CategoryFilter>("All");

  const allItems = items ?? [];

  // --- KPIs ---
  const highOrCritical = allItems.filter((item) => item.severity === "critical" || item.severity === "high");
  const affectedLocations = new Set(allItems.map((item) => item.location)).size;

  const kpiTiles = [
    { id: "infrastructure-issues", label: "Infrastructure Issues", value: String(allItems.length), caption: "Asset-condition records" },
    { id: "critical-high", label: "Critical / High Priority", value: String(highOrCritical.length), caption: "Needs attention" },
    { id: "corroborated", label: "Corroborated", value: "0", caption: "No multi-bus corroboration model yet" },
    { id: "affected-locations", label: "Affected Locations", value: String(affectedLocations), caption: "Unique locations tracked" },
  ];

  // --- category filter ---
  const categoryCounts = new Map<CategoryFilter, number>([["All", allItems.length]]);
  for (const item of allItems) {
    const bucket = infrastructureCategoryForAssetType(item.assetType);
    categoryCounts.set(bucket, (categoryCounts.get(bucket) ?? 0) + 1);
  }
  const distributionBuckets = INFRASTRUCTURE_CATEGORIES.map((bucket) => ({ bucket, count: categoryCounts.get(bucket) ?? 0 }));

  const filteredItems =
    category === "All" ? allItems : allItems.filter((item) => infrastructureCategoryForAssetType(item.assetType) === category);
  const needsAttention = [...filteredItems]
    .filter((item) => item.severity === "critical" || item.severity === "high")
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));

  const markers: MapMarker[] = filteredItems.map((item) => ({
    id: item.infrastructureIssueId,
    kind: "infrastructure-asset",
    label: `${item.location} · ${item.assetType.replace(/-/g, " ")}`,
    latitude: item.latitude,
    longitude: item.longitude,
    intensity: item.severity,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Infrastructure Intelligence"
        description="Municipal infrastructure deficiencies — missing dividers, zebra crossings, signboards and road damage — observed by the public transport fleet."
      />

      <KpiStrip tiles={kpiTiles} />

      <CategoryFilterRow categories={INFRASTRUCTURE_CATEGORIES} active={category} onChange={setCategory} counts={categoryCounts} />

      {needsAttention.length > 0 && (
        <Panel className="p-space-sm flex flex-col gap-space-xs">
          <PanelHeader title="Needs Attention" icon="priority_high" meta={<span className="font-label-code text-label-code text-ink-muted">{needsAttention.length} flagged</span>} />
          <div className="flex flex-col divide-y divide-border-slate">
            {needsAttention.map((item) => (
              <div key={item.infrastructureIssueId} className="flex items-center justify-between gap-space-sm py-1.5">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-title-sm text-title-sm text-ink-primary font-semibold capitalize truncate">
                    {item.assetType.replace(/-/g, " ")} &mdash; {item.condition}
                  </span>
                  <span className="font-body-sm text-body-sm text-ink-muted truncate">{item.location}</span>
                </div>
                <SeverityBadge severity={item.severity} className="shrink-0" />
              </div>
            ))}
          </div>
        </Panel>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md w-full items-start">
        <div className="xl:col-span-8">
          <Panel className="p-space-sm flex flex-col gap-space-xs">
            <PanelHeader
              title="Infrastructure Issue Intelligence"
              icon="domain"
              meta={<span className="font-label-code text-label-code text-ink-muted">{filteredItems.length} shown</span>}
            />
            {loading ? (
              <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading infrastructure issues…</div>
            ) : (
              <div className="flex flex-col divide-y divide-border-slate">
                {filteredItems.map((item) => (
                  <InfrastructureIssueCard key={item.infrastructureIssueId} item={item} />
                ))}
                {filteredItems.length === 0 && (
                  <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">
                    No infrastructure issues in this category.
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        <div id="infrastructure-map" className="xl:col-span-4 flex flex-col gap-space-md">
          <div className="h-[280px]">
            <GISMap markers={markers} title="Infrastructure Locations" />
          </div>
          <DetectionDistributionChart
            buckets={distributionBuckets}
            title="Infrastructure by Category"
            meta="Accumulated Intelligence"
            icon="bar_chart"
            emptyLabel="No infrastructure issues recorded yet."
          />
        </div>
      </section>
    </>
  );
}
