import { PanelHeader, StatusBadge } from "../ui";
import { CONGESTION_DISPLAY_LABEL } from "../../lib/congestion";
import type { Route, TrafficHotspot } from "../../types";
import type { CorridorVehicleClassification } from "../../services/analyticsService";

interface TrafficInsightsPanelProps {
  hotspots: TrafficHotspot[];
  routes: Route[];
  classification: CorridorVehicleClassification[];
}

interface Insight {
  text: string;
  prototype?: boolean;
}

const SEVERITY_RANK: Record<TrafficHotspot["congestionLevel"], number> = { severe: 3, high: 2, medium: 1, low: 0 };

// Every insight here is a plain derivation over real fixture fields
// (congestionLevel/averageSpeedKph/activeBusCount) — no generated prose
// that isn't traceable back to a specific value. The one insight built on
// the prototype vehicle-classification model is explicitly tagged so it
// isn't mistaken for a fixture-backed finding.
function buildInsights(hotspots: TrafficHotspot[], routes: Route[], classification: CorridorVehicleClassification[]): Insight[] {
  const insights: Insight[] = [];

  if (hotspots.length > 0) {
    const worst = [...hotspots].sort(
      (a, b) => SEVERITY_RANK[b.congestionLevel] - SEVERITY_RANK[a.congestionLevel] || a.averageSpeedKph - b.averageSpeedKph,
    )[0];
    insights.push({
      text: `${worst.location} is the highest-density corridor right now — ${CONGESTION_DISPLAY_LABEL[worst.congestionLevel].toLowerCase()} density at ${worst.averageSpeedKph} km/h observed.`,
    });

    const bottlenecks = hotspots.filter((h) => h.congestionLevel === "high" || h.congestionLevel === "severe");
    if (bottlenecks.length > 0) {
      insights.push({
        text: `${bottlenecks.length} corridor${bottlenecks.length === 1 ? " is" : "s are"} currently flagged as a bottleneck: ${bottlenecks.map((h) => h.location).join(", ")}.`,
      });
    }
  }

  if (routes.length > 0) {
    const busiest = [...routes].sort((a, b) => b.activeBusCount - a.activeBusCount)[0];
    if (busiest.activeBusCount > 0) {
      insights.push({
        text: `${busiest.origin} → ${busiest.destination} (${busiest.name}) carries the most active fleet assignment — ${busiest.activeBusCount} bus${busiest.activeBusCount === 1 ? "" : "es"}.`,
      });
    }
  }

  if (classification.length > 0) {
    const totals = classification.reduce(
      (acc, c) => ({
        cars: acc.cars + c.counts.cars,
        twoWheelers: acc.twoWheelers + c.counts.twoWheelers,
        buses: acc.buses + c.counts.buses,
        trucks: acc.trucks + c.counts.trucks,
      }),
      { cars: 0, twoWheelers: 0, buses: 0, trucks: 0 },
    );
    const dominant = (Object.entries(totals) as [keyof typeof totals, number][]).sort((a, b) => b[1] - a[1])[0];
    const label: Record<string, string> = { cars: "Cars", twoWheelers: "Two-wheelers", buses: "Buses", trucks: "Trucks" };
    insights.push({
      text: `${label[dominant[0]]} are the estimated dominant vehicle class across monitored corridors.`,
      prototype: true,
    });
  }

  return insights;
}

export function TrafficInsightsPanel({ hotspots, routes, classification }: TrafficInsightsPanelProps) {
  const insights = buildInsights(hotspots, routes, classification);

  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm flex flex-col gap-space-sm">
      <PanelHeader title="Traffic Insights" icon="insights" />
      <div className="flex flex-col gap-space-xs">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-space-xs">
            <span className="material-symbols-outlined text-primary-civic-active text-[16px] mt-0.5">arrow_right</span>
            <span className="font-body-sm text-body-sm text-ink-secondary flex-1">{insight.text}</span>
            {insight.prototype && <StatusBadge tone="info">Prototype</StatusBadge>}
          </div>
        ))}
        {insights.length === 0 && (
          <span className="font-body-sm text-body-sm text-ink-muted">Not enough data yet to generate traffic insights.</span>
        )}
      </div>
    </div>
  );
}
