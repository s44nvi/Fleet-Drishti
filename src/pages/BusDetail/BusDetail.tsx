import { Link, useParams } from "react-router-dom";
import { Bus as BusIcon, Clock, Gauge, MapPin, Radio, Route as RouteIcon, Video } from "lucide-react";
import { EmptyState, MetaStrip, PageHeader, Panel, PanelHeader, SeverityBadge, SourceBadge, StatusBadge } from "../../components/ui";
import { DetectionPlayer } from "../../components/ai";
import { ObservationRow } from "../../components/events";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, mediaService, routeService } from "../../services";
import { busMarker } from "../../lib/mapMarkers";
import { BUS_STATUS, CAMERA_STATUS } from "../../lib/status";
import { categoryVisual } from "../../lib/visuals";

function clock(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// Bus detail — what this bus has seen (evidence first), where it runs, and
// the state of its cameras as recorded in the fixtures.
export function BusDetail() {
  const { busId } = useParams<{ busId: string }>();
  const { data: bus, loading } = useAsyncData(() => fleetService.getBusById(busId ?? ""), [busId]);
  const { data: cameras } = useAsyncData(() => fleetService.listCamerasByBus(busId ?? ""), [busId]);
  const { data: allCameras } = useAsyncData(() => fleetService.listCameras(), []);
  const { data: route } = useAsyncData(() => (bus ? routeService.getRouteById(bus.routeId) : Promise.resolve(undefined)), [bus]);
  const { data: busEvents } = useAsyncData(() => eventService.listEventsByBus(busId ?? ""), [busId]);
  const { data: clips } = useAsyncData(() => mediaService.listDetectionClipsForBus(busId ?? ""), [busId]);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);

  if (!loading && !bus) {
    return (
      <>
        <PageHeader title="Bus not found" back={{ to: "/fleet", label: "Fleet" }} />
        <Panel>
          <EmptyState icon={BusIcon} title={`No bus with ID "${busId}"`} />
        </Panel>
      </>
    );
  }

  const routeNames = route ? { [route.routeId]: `${route.origin} → ${route.destination}` } : {};
  const sortedEvents = [...(busEvents ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <>
      <PageHeader
        back={{ to: "/fleet", label: "Fleet" }}
        title={bus?.label ?? "Loading…"}
        context={
          bus && (
            <>
              <span>
                {bus.routeId.replace("BEST-", "Route ")}
                {route && ` · ${route.origin} → ${route.destination}`}
              </span>
              <SourceBadge source="simulated" />
            </>
          )
        }
        actions={bus && <StatusBadge tone={BUS_STATUS[bus.status].tone}>{BUS_STATUS[bus.status].label}</StatusBadge>}
      />

      {bus && (
        <>
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Panel as="section" className="xl:col-span-7 p-4" aria-label="Detections from this bus">
              <DetectionPlayer clips={clips ?? []} routeNames={routeNames} cameras={allCameras ?? []} />
            </Panel>
            <GISMap
              className="xl:col-span-5 h-[380px] xl:h-auto xl:min-h-[420px]"
              ariaLabel={`${bus.label} position and route`}
              markers={[busMarker(bus)]}
              routeLines={networkRouteLines ?? []}
              highlightRoute={bus.routeId.replace("BEST-", "")}
              showLayerPanel={false}
            />
          </section>

          <Panel className="p-4">
            <MetaStrip
              items={[
                {
                  label: "Route",
                  value: route ? (
                    <Link to={`/routes/${route.routeId}`} className="text-action hover:text-action-strong">
                      {route.name}
                    </Link>
                  ) : (
                    bus.routeId
                  ),
                  icon: RouteIcon,
                },
                { label: "Speed", value: `${bus.speedKph} km/h`, icon: Gauge },
                { label: "Last seen", value: new Date(bus.lastSeenAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), icon: Clock },
                { label: "Position", value: `${bus.location.latitude.toFixed(4)}, ${bus.location.longitude.toFixed(4)}`, icon: MapPin },
              ]}
            />
          </Panel>

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Panel as="section" className="xl:col-span-7 p-2 flex flex-col">
              <PanelHeader className="px-2 pt-2 pb-1" title="What this bus has seen" icon={Radio} meta={`${sortedEvents.length}`} />
              {sortedEvents.length === 0 ? (
                <EmptyState compact title="No observations from this bus yet" />
              ) : (
                <ul>
                  {sortedEvents.map((event) => (
                    <li key={event.eventId}>
                      <ObservationRow
                        category={event.subtype}
                        title={categoryVisual(event.subtype).label}
                        meta={<span className="truncate">{event.location}</span>}
                        aside={
                          <>
                            <SeverityBadge severity={event.severity} />
                            <span className="tabular-nums">{clock(event.timestamp)}</span>
                          </>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel as="section" className="xl:col-span-5 p-4 flex flex-col gap-3">
              <PanelHeader title="Cameras" icon={Video} meta={`${cameras?.length ?? 0}`} />
              <ul className="flex flex-col divide-y divide-line">
                {(cameras ?? []).map((camera) => (
                  <li key={camera.cameraId} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-item text-ink capitalize">{camera.position.replace("-", " ")}</p>
                      <p className="text-meta text-ink-3 tabular-nums">
                        {camera.resolution} · {camera.fps} fps · heartbeat {clock(camera.lastHeartbeatAt)}
                      </p>
                    </div>
                    <StatusBadge tone={CAMERA_STATUS[camera.status].tone}>{CAMERA_STATUS[camera.status].label}</StatusBadge>
                  </li>
                ))}
                {(cameras ?? []).length === 0 && <li className="py-3 text-meta text-ink-3">No cameras registered</li>}
              </ul>
            </Panel>
          </section>
        </>
      )}
    </>
  );
}
