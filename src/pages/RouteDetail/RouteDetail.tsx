import { useParams } from "react-router-dom";
import { Bus as BusIcon, Route as RouteIcon, Ruler } from "lucide-react";
import { DataTable, EmptyState, MetaStrip, PageHeader, Panel, PanelHeader, SourceBadge, StatusBadge } from "../../components/ui";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { routeService } from "../../services";
import { busMarker } from "../../lib/mapMarkers";
import { BUS_STATUS } from "../../lib/status";
import type { Bus, DataTableColumn } from "../../types";

const busColumns: DataTableColumn<Bus>[] = [
  { key: "busId", header: "Bus", render: (bus) => <span className="text-item">{bus.label}</span> },
  { key: "status", header: "Status", render: (bus) => <StatusBadge tone={BUS_STATUS[bus.status].tone}>{BUS_STATUS[bus.status].label}</StatusBadge> },
  { key: "speed", header: "Speed", render: (bus) => `${bus.speedKph} km/h`, align: "right" },
  { key: "lastSeen", header: "Last seen", render: (bus) => new Date(bus.lastSeenAt).toLocaleTimeString("en-IN"), align: "right" },
];

export function RouteDetail() {
  const { routeId } = useParams<{ routeId: string }>();
  const { data: route, loading } = useAsyncData(() => routeService.getRouteById(routeId ?? ""), [routeId]);
  const { data: buses } = useAsyncData(() => routeService.listBusesForRoute(routeId ?? ""), [routeId]);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);

  if (!loading && !route) {
    return (
      <>
        <PageHeader title="Route not found" back={{ to: "/routes", label: "Routes" }} />
        <Panel>
          <EmptyState icon={RouteIcon} title={`No route with ID "${routeId}"`} />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={{ to: "/routes", label: "Routes" }}
        title={route?.name ?? "Loading…"}
        context={route && <span>{route.origin} → {route.destination}</span>}
      />

      {route && (
        <>
          <GISMap
            className="h-[420px]"
            ariaLabel={`${route.name} on the BEST network`}
            markers={(buses ?? []).map(busMarker)}
            routeLines={networkRouteLines ?? []}
            highlightRoute={route.routeId.replace("BEST-", "")}
            showLayerPanel={false}
          />
          <Panel className="p-4">
            <MetaStrip
              items={[
                { label: "Distance", value: `${route.distanceKm} km`, icon: Ruler },
                { label: "Assigned buses", value: route.assignedBusIds.length, icon: BusIcon },
                { label: "Active buses", value: route.activeBusCount, icon: BusIcon },
                { label: "Network data", value: route.networkSource === "GTFS_BEST" ? "BEST GTFS (community feed)" : "Simulated", icon: RouteIcon },
              ]}
            />
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader className="px-4 pt-4 pb-3" title="Buses on this route" icon={BusIcon} actions={<SourceBadge source="simulated" />} />
            <DataTable
              columns={busColumns}
              rows={buses ?? []}
              getRowKey={(bus) => bus.busId}
              getRowHref={(bus) => `/fleet/${bus.busId}`}
              emptyLabel="No buses assigned."
            />
          </Panel>
        </>
      )}
    </>
  );
}
