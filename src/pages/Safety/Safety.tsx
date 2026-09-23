import { useState } from "react";
import { PageHeader, Panel, PanelHeader, CategoryFilterRow } from "../../components/ui";
import { KpiStrip } from "../../components/telemetry";
import { IssueCard, IntelligenceCard } from "../../components/events";
import { PedestrianRiskCard, VehicleIncidentPanel } from "../../components/safety";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, issueService } from "../../services";
import { groupEventsIntoIntelligence } from "../../lib/intelligenceGrouping";
import {
  SAFETY_EVENT_CATEGORIES,
  isVehicleIncidentCategory,
  safetyCategoryForType,
  type SafetyEventCategory,
} from "../../lib/taxonomy";
import type { Event, Issue, MapMarker, SafetyEvent } from "../../types";

type CategoryFilter = "All" | SafetyEventCategory;

// A SafetyEvent that was also promoted through the Event -> Issue pipeline
// shares its busId + exact timestamp with the originating Event (see
// data/mock/safety.ts vs events.ts: SE-1/SE-2 mirror EVT-PED-1/EVT-PED-2
// exactly). That's the only linkage available without a shared id, so this
// is a best-effort match, not a guess — an exact bus+timestamp collision
// only happens because the fixtures were authored to represent the same
// real-world sighting twice (once as the lightweight monitoring signal,
// once as the full AI pipeline record).
function findMatchedIssue(safetyEvent: SafetyEvent, events: Event[], issues: Issue[]): Issue | undefined {
  const matchingEvent = events.find(
    (event) => event.busId === safetyEvent.busId && event.timestamp === safetyEvent.observedAt,
  );
  if (!matchingEvent) return undefined;
  return issues.find((issue) => issue.relatedEventIds.includes(matchingEvent.eventId));
}

// Safety Intelligence: PS §"vulnerable pedestrian situations" (school
// children crossing, etc.) and §"hit-and-run / rash driving" vehicle
// tracking + ANPR. Two distinct populations, kept visually separate:
//
//  - mockSafetyEvents — the primary, always-on pedestrian/vulnerable-road-
//    user monitoring signal (same architectural role as Traffic's
//    TrafficHotspot). All 6 fixtures are real.
//  - the Event/Issue pipeline (eventType/type === "safety") — the subset of
//    those signals that has been corroborated across multiple buses into a
//    fused Issue (currently just SF-302, Sion Circle). Reuses the exact
//    grouping logic already built for Road Issues — no second grouping
//    system.
//
// Vehicle Incident Intelligence (rash driving / hit-and-run / ANPR) has no
// supporting fixture data anywhere in this codebase — see
// VehicleIncidentPanel's doc comment. It is shown as a real, empty,
// PS-aligned taxonomy rather than fabricated incidents.
export function Safety() {
  const { data: safetyEvents, loading } = useAsyncData(() => issueService.listSafetyEvents(), []);
  const { data: issues } = useAsyncData(() => issueService.listIssues(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const [category, setCategory] = useState<CategoryFilter>("All");

  const allSafetyEvents = safetyEvents ?? [];
  const allIssues = issues ?? [];
  const allEvents = events ?? [];

  const safetyIssues = allIssues.filter((issue) => issue.type === "safety");
  const safetyPipelineEvents = allEvents.filter((event) => event.eventType === "safety");
  const standaloneGroups = (() => {
    const issueIds = new Set(safetyIssues.map((issue) => issue.issueId));
    return groupEventsIntoIntelligence(safetyPipelineEvents, safetyIssues).filter((group) => !issueIds.has(group.key));
  })();

  // --- A: KPIs — every value real and traceable to one of the two
  // populations above; "Corroborated Events" uses the same definition as
  // Road Issues' equivalent metric (2+ buses observing) ---
  const categoryCounts = new Map<CategoryFilter, number>([["All", allSafetyEvents.length]]);
  for (const event of allSafetyEvents) {
    const bucket = safetyCategoryForType(event.type);
    categoryCounts.set(bucket, (categoryCounts.get(bucket) ?? 0) + 1);
  }
  const vehicleIncidentCount = SAFETY_EVENT_CATEGORIES.filter(isVehicleIncidentCategory).reduce(
    (sum, cat) => sum + (categoryCounts.get(cat) ?? 0),
    0,
  );
  const corroboratedCount =
    safetyIssues.filter((issue) => issue.observationCount > 1).length +
    standaloneGroups.filter((group) => group.corroborated).length;

  const kpiTiles = [
    { id: "active-safety-events", label: "Active Safety Events", value: String(allSafetyEvents.length), caption: "Monitored signals" },
    {
      id: "critical-incidents",
      label: "Critical Incidents",
      value: String(allSafetyEvents.filter((e) => e.severity === "critical").length),
      caption: "Highest severity",
    },
    {
      id: "pedestrian-risks",
      label: "Pedestrian Risks",
      value: String(allSafetyEvents.filter((e) => e.type === "pedestrian-conflict" || e.type === "crossing-risk").length),
      caption: "Conflict / crossing risk",
    },
    { id: "vehicle-incidents", label: "Vehicle Incidents", value: String(vehicleIncidentCount), caption: "ANPR / tracking not yet connected" },
    { id: "corroborated", label: "Corroborated Events", value: String(corroboratedCount), caption: "2+ buses observing" },
  ];

  // --- B2/C: category filter, applied to both the grouped Issue list (B)
  // and the pedestrian-risk cards (C) ---
  const filteredSafetyEvents =
    category === "All" ? allSafetyEvents : allSafetyEvents.filter((e) => safetyCategoryForType(e.type) === category);
  const filteredIssues =
    category === "All" ? safetyIssues : safetyIssues.filter((issue) => safetyCategoryForType(issue.subtype) === category);
  const filteredGroups =
    category === "All" ? standaloneGroups : standaloneGroups.filter((group) => safetyCategoryForType(group.subtype) === category);

  // --- E: incident map — built from the complete real SafetyEvent
  // population (not the Issue/group population, which would duplicate the
  // same real-world location a second time for Sion Circle) ---
  const markers: MapMarker[] = filteredSafetyEvents.map((event) => {
    const matchedIssue = findMatchedIssue(event, allEvents, allIssues);
    return {
      id: event.safetyEventId,
      kind: "vulnerable-crossing",
      label: `${event.location} · ${event.type.replace(/-/g, " ")}`,
      latitude: event.latitude,
      longitude: event.longitude,
      intensity: event.severity,
      href: matchedIssue ? `/road-issues/${matchedIssue.issueId}` : undefined,
    };
  });

  const vehicleCategoryCounts = SAFETY_EVENT_CATEGORIES.filter(isVehicleIncidentCategory).map((label) => ({
    label,
    count: categoryCounts.get(label) ?? 0,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Safety Intelligence"
        description="Vulnerable pedestrian risk and vehicle incident intelligence from the public transport fleet."
      />

      <KpiStrip tiles={kpiTiles} columns={5} />

      {/* B4: category filter — PS taxonomy including zero-count categories */}
      <CategoryFilterRow categories={SAFETY_EVENT_CATEGORIES} active={category} onChange={setCategory} counts={categoryCounts} />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md w-full items-start">
        {/* B: Active Safety Events — the corroborated Issue/Event-pipeline
            view, reusing the exact same components/grouping as Road Issues */}
        <div className="xl:col-span-7 flex flex-col gap-space-md">
          <Panel className="p-space-sm flex flex-col gap-space-xs">
            <PanelHeader
              title="Active Safety Events"
              icon="shield"
              meta={<span className="font-label-code text-label-code text-ink-muted">{filteredIssues.length + filteredGroups.length} corroborated / live</span>}
            />
            {loading ? (
              <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading safety events…</div>
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
                    No safety events have reached the Event/Issue pipeline in this category yet.
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* D: Vehicle Incident Intelligence */}
          <VehicleIncidentPanel categoryCounts={vehicleCategoryCounts} />
        </div>

        {/* E: Incident map — real coordinates, severity-shaded markers */}
        <div className="xl:col-span-5 flex flex-col gap-space-md">
          <div className="h-[320px]">
            <GISMap markers={markers} title="Incident Map" />
          </div>
        </div>
      </section>

      {/* C: Vulnerable Pedestrian Risk — every monitored signal, corroborated or not */}
      <Panel className="p-space-sm flex flex-col gap-space-sm">
        <PanelHeader
          title="Vulnerable Pedestrian Risk"
          icon="directions_walk"
          meta={<span className="font-label-code text-label-code text-ink-muted">{filteredSafetyEvents.length} monitored</span>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          {filteredSafetyEvents.map((event) => (
            <PedestrianRiskCard
              key={event.safetyEventId}
              event={event}
              matchedIssue={findMatchedIssue(event, allEvents, allIssues)}
            />
          ))}
          {filteredSafetyEvents.length === 0 && (
            <span className="p-space-md font-body-sm text-body-sm text-ink-muted">No pedestrian risk signals in this category.</span>
          )}
        </div>
      </Panel>
    </>
  );
}
