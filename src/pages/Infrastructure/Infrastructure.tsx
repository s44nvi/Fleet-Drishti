import { useMemo, useState } from "react";
import { Bus, Construction, Footprints, SeparatorVertical, Signpost, TriangleAlert, Waves, type LucideIcon } from "lucide-react";
import { IconTile, PageHeader, SeverityBadge, SourceBadge, StatusBadge } from "../../components/ui";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, issueService } from "../../services";
import { groupEventsIntoIntelligence } from "../../lib/intelligenceGrouping";
import {
  INFRASTRUCTURE_CATEGORIES,
  infrastructureCategoryForAssetType,
  infrastructureCategoryForSubtype,
  isRoadDomainType,
  type InfrastructureCategory,
} from "../../lib/taxonomy";
import { ISSUE_STATUS } from "../../lib/status";
import { categoryVisual, humanize, type Tone } from "../../lib/visuals";
import { datasetAnchor } from "../../lib/pulse";
import { formatMinutesAgo, minutesAgo } from "../../lib/timeAgo";
import { cn } from "../../lib/cn";
import type { IssueStatus, MapMarker, Severity } from "../../types";

const CATEGORY_ICON: Record<InfrastructureCategory, LucideIcon> = {
  "Missing Divider": SeparatorVertical,
  "Missing/Faded Zebra Crossing": Footprints,
  "Damaged/Missing Signboard": Signpost,
  "Road Damage": Construction,
  Waterlogging: Waves,
  "Other Road Hazard": TriangleAlert,
};

const CATEGORY_TONE: Record<InfrastructureCategory, Tone> = {
  "Missing Divider": "watch",
  "Missing/Faded Zebra Crossing": "watch",
  "Damaged/Missing Signboard": "watch",
  "Road Damage": "watch",
  Waterlogging: "action",
  "Other Road Hazard": "neutral",
};

// Domain-specific card shape: an asset-condition record and a bus
// observation group carry different facts, so each keeps its own.
interface BoardItem {
  id: string;
  category: InfrastructureCategory;
  title: string;
  location: string;
  severity: Severity;
  status?: IssueStatus;
  observedAt: string;
  busIds?: string[];
  source: "asset" | "observation";
  marker: MapMarker;
}

// Infrastructure: "What infrastructure needs attention?"
// A board with exactly the SIH PS infrastructure categories as columns.
// Records come from PS-scope asset-condition fixtures and from bus road
// observations in those categories. Out-of-scope asset types (streetlight,
// drainage, utility pole) are not shown.
export function Infrastructure() {
  const { data: assets } = useAsyncData(() => issueService.listInfrastructureIssues(), []);
  const { data: issues } = useAsyncData(() => issueService.listIssues(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const anchor = useMemo(
    () => datasetAnchor([...(events ?? []).map((e) => e.timestamp), ...(assets ?? []).map((a) => a.observedAt)]),
    [events, assets],
  );

  const items = useMemo<BoardItem[]>(() => {
    const out: BoardItem[] = [];
    for (const asset of assets ?? []) {
      const category = infrastructureCategoryForAssetType(asset.assetType);
      if (!category) continue;
      const title = `${categoryVisual(asset.assetType).label} ${asset.condition}`;
      out.push({
        id: asset.infrastructureIssueId,
        category,
        title,
        location: asset.location,
        severity: asset.severity,
        status: asset.status,
        observedAt: asset.observedAt,
        source: "asset",
        marker: {
          id: asset.infrastructureIssueId,
          kind: "infrastructure-asset",
          category: asset.assetType,
          label: title,
          detail: asset.location,
          latitude: asset.latitude,
          longitude: asset.longitude,
          intensity: asset.severity,
        },
      });
    }
    const roadIssues = (issues ?? []).filter((i) => isRoadDomainType(i.type));
    for (const issue of roadIssues) {
      const category = infrastructureCategoryForSubtype(issue.subtype);
      if (!category) continue;
      out.push({
        id: issue.issueId,
        category,
        title: categoryVisual(issue.subtype).label,
        location: issue.location,
        severity: issue.severity,
        status: issue.status,
        observedAt: issue.lastSeen,
        busIds: issue.observingBuses,
        source: "observation",
        marker: {
          id: issue.issueId,
          kind: "infrastructure-asset",
          category: issue.subtype,
          label: categoryVisual(issue.subtype).label,
          detail: issue.location,
          latitude: issue.latitude,
          longitude: issue.longitude,
          intensity: issue.severity,
          href: `/road-issues/${issue.issueId}`,
        },
      });
    }
    const fused = new Set(roadIssues.map((i) => i.issueId));
    const groups = groupEventsIntoIntelligence((events ?? []).filter((e) => isRoadDomainType(e.eventType)), roadIssues).filter(
      (g) => !fused.has(g.key),
    );
    for (const group of groups) {
      const category = infrastructureCategoryForSubtype(group.subtype);
      if (!category) continue;
      out.push({
        id: group.key,
        category,
        title: categoryVisual(group.subtype).label,
        location: group.location,
        severity: group.severity,
        observedAt: group.lastObserved,
        busIds: group.busIds,
        source: "observation",
        marker: {
          id: group.key,
          kind: "infrastructure-asset",
          category: group.subtype,
          label: categoryVisual(group.subtype).label,
          detail: group.location,
          latitude: group.latitude,
          longitude: group.longitude,
          intensity: group.severity,
        },
      });
    }
    return out;
  }, [assets, issues, events]);

  const needsAction = items.filter((i) => i.severity === "high" || i.severity === "critical" || i.status === "action-required").length;

  return (
    <>
      <PageHeader
        title="Infrastructure"
        subtitle="Track missing, damaged, or degraded urban infrastructure."
        banner
        context={
          <>
            <span className="tabular-nums">
              {items.length} records · {needsAction} need action
            </span>
            <SourceBadge source="simulated" />
          </>
        }
      />

      <section aria-label="Condition board" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
        {INFRASTRUCTURE_CATEGORIES.map((category) => {
          const columnItems = items.filter((i) => i.category === category);
          return (
            <div key={category} className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2/70 p-2.5 min-h-[168px]">
              <div className="flex items-center gap-2 px-1 pt-0.5">
                <IconTile icon={CATEGORY_ICON[category]} tone={columnItems.length ? CATEGORY_TONE[category] : "neutral"} size="sm" />
                <h2 className={cn("flex-1 text-item leading-tight", columnItems.length ? "text-ink" : "text-ink-3")}>{category}</h2>
                <span className="text-item text-ink-2 tabular-nums">{columnItems.length}</span>
              </div>
              {columnItems.length === 0 ? (
                <p className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-line-strong text-meta text-ink-3 text-center px-3 py-4">
                  None detected
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {columnItems.map((item) => {
                    const selected = item.id === selectedId;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(selected ? null : item.id)}
                          aria-pressed={selected}
                          className={cn(
                            "w-full flex flex-col gap-1.5 rounded-lg bg-surface border px-3 py-2.5 text-left shadow-panel transition-colors duration-150",
                            selected ? "border-action ring-1 ring-action/30" : "border-line hover:border-line-strong",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-item text-ink">{humanize(item.title)}</span>
                            <SeverityBadge severity={item.severity} />
                          </div>
                          <span className="text-meta text-ink-3 truncate">{item.location}</span>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-3">
                            {item.status ? (
                              <StatusBadge tone={ISSUE_STATUS[item.status].tone}>{ISSUE_STATUS[item.status].label}</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">Awaiting corroboration</StatusBadge>
                            )}
                            {item.busIds && (
                              <span className="inline-flex items-center gap-1">
                                <Bus size={12} aria-hidden="true" />
                                {item.busIds.length}
                              </span>
                            )}
                            <span className="tabular-nums ml-auto">{formatMinutesAgo(minutesAgo(item.observedAt, anchor))}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <GISMap
        className="h-[420px]"
        ariaLabel="Infrastructure locations"
        markers={items.map((i) => i.marker)}
        selectedId={selectedId}
        onSelect={setSelectedId}
        fitToMarkers
        showLayerPanel={false}
      />
    </>
  );
}
