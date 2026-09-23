import { Link, useParams } from "react-router-dom";
import { PageHeader, Panel, PanelHeader, DataTable, StatusBadge } from "../../components/ui";
import { TelemetryRow } from "../../components/telemetry";
import { useAsyncData } from "../../hooks/useAsyncData";
import { routeService } from "../../services";
import type { Bus, DataTableColumn, BadgeTone } from "../../types";

const BUS_STATUS_TONE: Record<Bus["status"], BadgeTone> = {
  active: "success",
  idle: "info",
  offline: "critical",
  maintenance: "high",
};

const busColumns: DataTableColumn<Bus>[] = [
  { key: "busId", header: "Bus", render: (bus) => <span className="font-label-code text-label-code font-semibold">{bus.label}</span> },
  { key: "status", header: "Status", render: (bus) => <StatusBadge tone={BUS_STATUS_TONE[bus.status]}>{bus.status}</StatusBadge> },
  { key: "speed", header: "Speed", render: (bus) => `${bus.speedKph} km/h`, align: "right" },
  { key: "lastSeen", header: "Last Seen", render: (bus) => new Date(bus.lastSeenAt).toLocaleTimeString("en-IN"), align: "right" },
];

export function RouteDetail() {
  const { routeId } = useParams<{ routeId: string }>();
  const { data: route, loading } = useAsyncData(() => routeService.getRouteById(routeId ?? ""), [routeId]);
  const { data: buses } = useAsyncData(() => routeService.listBusesForRoute(routeId ?? ""), [routeId]);

  if (!loading && !route) {
    return (
      <>
        <PageHeader eyebrow="Fleet" title="Route Intelligence" description="Deep-dive detail view for a single transit route." />
        <Panel className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">No route found for ID "{routeId}".</Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title={route ? route.name : "Route Intelligence"}
        description={route ? `${route.origin} → ${route.destination}` : "Loading route detail…"}
      />

      {route && (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md w-full items-start">
          <div className="xl:col-span-4">
            <Panel className="p-space-sm flex flex-col gap-space-xs">
              <PanelHeader title="Route Telemetry" icon="alt_route" />
              <TelemetryRow label="Corridor" value={route.corridor} />
              <TelemetryRow label="Distance" value={`${route.distanceKm} km`} />
              <TelemetryRow label="Assigned Buses" value={route.assignedBusIds.length} />
              <TelemetryRow label="Active Buses" value={route.activeBusCount} />
              {route.networkSource === "GTFS_BEST" && (
                <TelemetryRow label="Network Data" value="Public BEST route network" />
              )}
            </Panel>
          </div>

          <div className="xl:col-span-8">
            <Panel className="overflow-hidden">
              <div className="p-space-sm">
                <PanelHeader title="Buses on This Route" icon="directions_bus" />
              </div>
              <DataTable
                columns={busColumns}
                rows={buses ?? []}
                getRowKey={(bus) => bus.busId}
                getRowHref={(bus) => `/fleet/${bus.busId}`}
                emptyLabel="No buses currently assigned."
              />
            </Panel>
          </div>
        </section>
      )}

      {route && (
        <Link to="/routes" className="font-label-code text-label-code text-ink-secondary hover:text-ink-primary transition-colors w-fit">
          ← Back to Routes
        </Link>
      )}
    </>
  );
}
