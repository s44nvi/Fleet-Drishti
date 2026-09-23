import { PageHeader, Panel, DataTable } from "../../components/ui";
import { useAsyncData } from "../../hooks/useAsyncData";
import { routeService } from "../../services";
import type { DataTableColumn, Route } from "../../types";

const columns: DataTableColumn<Route>[] = [
  { key: "routeId", header: "Route", render: (route) => <span className="font-label-code text-label-code font-semibold">{route.name}</span> },
  { key: "corridor", header: "Corridor", render: (route) => route.corridor },
  { key: "origin", header: "Origin", render: (route) => route.origin },
  { key: "destination", header: "Destination", render: (route) => route.destination },
  { key: "distance", header: "Distance", render: (route) => `${route.distanceKm} km`, align: "right" },
  { key: "buses", header: "Active Buses", render: (route) => route.activeBusCount, align: "right" },
];

// List view — links into /routes/:routeId (RouteDetail) for a single route's
// intelligence view.
export function RoutesList() {
  const { data: routes, loading } = useAsyncData(() => routeService.listRoutes(), []);

  return (
    <>
      <PageHeader eyebrow="Fleet" title="Routes" description="Route-level intelligence and analytics." />
      <Panel className="overflow-hidden">
        {loading ? (
          <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading routes…</div>
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
