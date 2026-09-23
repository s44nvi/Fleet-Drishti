import { PageHeader, Panel, DataTable, SourceBadge } from "../../components/ui";
import { useAsyncData } from "../../hooks/useAsyncData";
import { routeService } from "../../services";
import type { DataTableColumn, Route } from "../../types";

const columns: DataTableColumn<Route>[] = [
  { key: "routeId", header: "Route", render: (route) => <span className="text-item">{route.name}</span> },
  { key: "path", header: "Origin → destination", render: (route) => `${route.origin} → ${route.destination}` },
  { key: "distance", header: "Distance", render: (route) => `${route.distanceKm} km`, align: "right" },
  { key: "buses", header: "Active buses", render: (route) => route.activeBusCount, align: "right" },
];

export function RoutesList() {
  const { data: routes, loading } = useAsyncData(() => routeService.listRoutes(), []);

  return (
    <>
      <PageHeader
        title="Routes"
        context={
          <>
            <span>BEST community GTFS feed</span>
            <span aria-hidden="true">·</span>
            <span>Bus assignment</span>
            <SourceBadge source="simulated" />
          </>
        }
      />
      <Panel className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-body text-ink-3">Loading routes…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={routes ?? []}
            getRowKey={(route) => route.routeId}
            getRowHref={(route) => `/routes/${route.routeId}`}
            emptyLabel="No routes registered."
          />
        )}
      </Panel>
    </>
  );
}
