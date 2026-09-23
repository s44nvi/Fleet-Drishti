import { Link, useParams } from "react-router-dom";
import { PageHeader, Panel, PanelHeader, StatusBadge, DataTable } from "../../components/ui";
import { TelemetryRow } from "../../components/telemetry";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, routeService } from "../../services";
import type { BadgeTone, Bus, Camera, DataTableColumn } from "../../types";

const BUS_STATUS_TONE: Record<Bus["status"], BadgeTone> = {
  active: "success",
  idle: "info",
  offline: "critical",
  maintenance: "high",
};

const CAMERA_STATUS_TONE: Record<Camera["status"], BadgeTone> = {
  online: "success",
  degraded: "high",
  offline: "critical",
};

const cameraColumns: DataTableColumn<Camera>[] = [
  { key: "cameraId", header: "Camera", render: (camera) => <span className="font-label-code text-label-code font-semibold">{camera.cameraId}</span> },
  { key: "position", header: "Position", render: (camera) => <span className="capitalize">{camera.position.replace(/-/g, " ")}</span> },
  { key: "resolution", header: "Resolution", render: (camera) => camera.resolution },
  { key: "fps", header: "FPS", render: (camera) => camera.fps, align: "right" },
  { key: "status", header: "Status", render: (camera) => <StatusBadge tone={CAMERA_STATUS_TONE[camera.status]}>{camera.status}</StatusBadge> },
];

export function BusDetail() {
  const { busId } = useParams<{ busId: string }>();
  const { data: bus, loading } = useAsyncData(() => fleetService.getBusById(busId ?? ""), [busId]);
  const { data: cameras } = useAsyncData(() => fleetService.listCamerasByBus(busId ?? ""), [busId]);
  const { data: route } = useAsyncData(() => (bus ? routeService.getRouteById(bus.routeId) : Promise.resolve(undefined)), [bus]);
  const { data: busEvents } = useAsyncData(() => eventService.listEventsByBus(busId ?? ""), [busId]);

  if (!loading && !bus) {
    return (
      <>
        <PageHeader eyebrow="Fleet" title="Bus Intelligence Detail" description="Deep-dive detail view for a single transit vehicle." />
        <Panel className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">No bus found for ID "{busId}".</Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title={bus ? bus.label : "Bus Intelligence Detail"}
        description={bus && route ? `${route.name} · ${route.origin} → ${route.destination}` : "Loading bus detail…"}
        actions={bus && <StatusBadge tone={BUS_STATUS_TONE[bus.status]}>{bus.status}</StatusBadge>}
      />

      {bus && (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md w-full items-start">
          <div className="xl:col-span-5">
            <Panel className="p-space-sm flex flex-col gap-space-xs">
              <PanelHeader title="Bus Telemetry" icon="directions_bus" />
              <TelemetryRow label="Route" value={route ? <Link to={`/routes/${route.routeId}`} className="text-primary-civic-active hover:underline">{route.name}</Link> : bus.routeId} />
              <TelemetryRow label="Speed" value={`${bus.speedKph} km/h`} />
              <TelemetryRow label="Coordinates" value={`${bus.location.latitude.toFixed(4)}, ${bus.location.longitude.toFixed(4)}`} />
              <TelemetryRow label="Last Seen" value={new Date(bus.lastSeenAt).toLocaleString("en-IN")} />
              <TelemetryRow label="Camera Count" value={bus.cameraIds.length} />
            </Panel>
          </div>

          <div className="xl:col-span-7">
            <Panel className="overflow-hidden">
              <div className="p-space-sm">
                <PanelHeader title="Onboard Cameras" icon="videocam" />
              </div>
              <DataTable columns={cameraColumns} rows={cameras ?? []} getRowKey={(camera) => camera.cameraId} emptyLabel="No cameras registered." />
            </Panel>
          </div>

          <div className="xl:col-span-12">
            <Panel className="p-space-sm flex flex-col gap-space-sm">
              <PanelHeader title="Recent Events From This Bus" icon="bolt" />
              <div className="flex flex-col gap-space-xs">
                {(busEvents ?? []).map((event) => (
                  <div key={event.eventId} className="flex items-center justify-between border border-border-slate rounded px-space-sm py-1.5">
                    <span className="font-label-code text-label-code text-ink-primary capitalize">{event.subtype.replace(/-/g, " ")}</span>
                    <span className="font-label-code text-label-code text-ink-secondary">{event.location}</span>
                    <span className="font-label-code text-label-code text-ink-muted">{new Date(event.timestamp).toLocaleTimeString("en-IN")}</span>
                  </div>
                ))}
                {(busEvents ?? []).length === 0 && (
                  <span className="font-body-sm text-body-sm text-ink-muted">No events recorded from this bus yet.</span>
                )}
              </div>
            </Panel>
          </div>
        </section>
      )}
    </>
  );
}
