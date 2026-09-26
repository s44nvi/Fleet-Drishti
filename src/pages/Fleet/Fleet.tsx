import { useMemo, useState } from "react";
import { Bus as BusIcon, Gauge, ScanEye, Video } from "lucide-react";
import { ButtonLink, EmptyState, IconTile, PageHeader, Panel, SourceBadge, StatusBadge } from "../../components/ui";
import { GISMap, MapDrawer, SensingBusCard } from "../../components/gis";
import { DetectionPlayer } from "../../components/ai";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, mediaService, routeService } from "../../services";
import { busMarker, demoBusMarker } from "../../lib/mapMarkers";
import { demoBusView } from "../../lib/sensingBus";
import { BUS_STATUS, CAMERA_STATUS } from "../../lib/status";
import { TONE_CLASSES } from "../../lib/visuals";
import { datasetAnchor } from "../../lib/pulse";
import { formatMinutesAgo, minutesAgo } from "../../lib/timeAgo";
import { cn } from "../../lib/cn";
import type { Bus, Camera } from "../../types";

const STATUS_ORDER: Bus["status"][] = ["active", "idle", "maintenance", "offline"];

// On-route with at least one camera that isn't offline — both facts come
// straight from the bus and camera fixtures.
function isSensing(bus: Bus, cameras: Camera[]) {
  return bus.status === "active" && cameras.some((c) => c.busId === bus.busId && c.status !== "offline");
}

// Fleet: "Which buses are sensing the city?"
// A roster of buses (status, route, cameras, what each has seen) beside a
// map that highlights the selected bus's BEST route.
export function Fleet() {
  const { data: buses, loading } = useAsyncData(() => fleetService.listBuses(), []);
  const { data: cameras } = useAsyncData(() => fleetService.listCameras(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);
  const { data: clips } = useAsyncData(() => mediaService.listDetectionClips(), []);
  const { data: networkRouteLines } = useAsyncData(() => routeService.listNetworkRouteLines(), []);
  const { data: networkStops } = useAsyncData(() => routeService.listNetworkStops(), []);
  // DEMO density layer — map only; the roster stays the fixture fleet.
  const { data: demoBuses } = useAsyncData(() => fleetService.listDemoSensingBuses(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const allBuses = useMemo(() => buses ?? [], [buses]);
  const allCameras = useMemo(() => cameras ?? [], [cameras]);
  const anchor = useMemo(() => datasetAnchor(allBuses.map((b) => b.lastSeenAt)), [allBuses]);
  const routeById = useMemo(() => new Map((routes ?? []).map((r) => [r.routeId, r])), [routes]);
  const routeNames = Object.fromEntries((routes ?? []).map((r) => [r.routeId, `${r.origin} → ${r.destination}`]));

  const statusCounts = STATUS_ORDER.map((status) => ({ status, count: allBuses.filter((b) => b.status === status).length })).filter(
    (s) => s.count > 0,
  );
  const sensingCount = allBuses.filter((b) => isSensing(b, allCameras)).length;

  const selected = allBuses.find((b) => b.busId === selectedId);
  const selectedRoute = selected ? routeById.get(selected.routeId) : undefined;
  const selectedCameras = allCameras.filter((c) => c.busId === selectedId);
  const selectedClips = (clips ?? []).filter((c) => c.busId === selectedId);
  const selectedShortName = selected ? selected.routeId.replace("BEST-", "") : null;
  const selectedDemo = demoBuses?.find((b) => b.busId === selectedId);
  const selectedRouteHasGeometry = Boolean(
    selectedDemo ||
      (selectedShortName && networkRouteLines?.some((l) => l.agencyId === "BEST" && l.shortName === selectedShortName)),
  );
  const mapMarkers = useMemo(() => [...(demoBuses ?? []).map(demoBusMarker), ...allBuses.map(busMarker)], [demoBuses, allBuses]);

  function select(id: string | null) {
    setSelectedId(id);
    if (id) document.getElementById(`bus-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  return (
    <>
      <PageHeader
        title="Fleet"
        subtitle="Monitor connected buses, routes, sensing status, and fleet coverage."
        banner
        context={
          <>
            <span className="tabular-nums">
              {sensingCount} of {allBuses.length} buses sensing now
            </span>
            <SourceBadge source="simulated" />
          </>
        }
      />

      {allBuses.length > 0 && (
        <Panel className="px-4 py-3 flex flex-col gap-2">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label={statusCounts.map((s) => `${s.count} ${BUS_STATUS[s.status].label}`).join(", ")}>
            {statusCounts.map(({ status, count }) => (
              <span key={status} className={TONE_CLASSES[BUS_STATUS[status].tone].solid} style={{ width: `${(count / allBuses.length) * 100}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {statusCounts.map(({ status, count }) => (
              <span key={status} className="inline-flex items-center gap-1.5 text-meta text-ink-2">
                <span className={cn("h-2 w-2 rounded-full", TONE_CLASSES[BUS_STATUS[status].tone].dot)} aria-hidden="true" />
                <span className="text-item text-ink tabular-nums">{count}</span> {BUS_STATUS[status].label}
              </span>
            ))}
          </div>
        </Panel>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:h-[calc(100dvh-21rem)] xl:min-h-[540px]">
        <Panel as="section" className="xl:col-span-5 flex flex-col min-h-0" aria-label="Bus roster">
          {loading ? (
            <p className="p-6 text-body text-ink-3">Loading fleet…</p>
          ) : allBuses.length === 0 ? (
            <EmptyState icon={BusIcon} title="No buses connected" />
          ) : (
            <ul className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5">
              {allBuses.map((bus) => {
                const status = BUS_STATUS[bus.status];
                const route = routeById.get(bus.routeId);
                const busCameras = allCameras.filter((c) => c.busId === bus.busId);
                const camerasUp = busCameras.filter((c) => c.status !== "offline").length;
                const busEvents = (events ?? []).filter((e) => e.busId === bus.busId);
                const isSelected = bus.busId === selectedId;
                return (
                  <li key={bus.busId} id={`bus-${bus.busId}`}>
                    <button
                      type="button"
                      onClick={() => select(isSelected ? null : bus.busId)}
                      onMouseEnter={() => setHoveredId(bus.busId)}
                      onMouseLeave={() => setHoveredId(null)}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                        isSelected ? "bg-action-soft ring-1 ring-action/30" : "hover:bg-surface-2",
                      )}
                    >
                      <IconTile icon={BusIcon} tone={status.tone} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-item text-ink">{bus.label}</span>
                          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        </div>
                        <p className="text-meta text-ink-3 truncate">
                          {bus.routeId.replace("BEST-", "Route ")}
                          {route && ` · ${route.origin} → ${route.destination}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-meta text-ink-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1" title={`${camerasUp} of ${busCameras.length} cameras up`}>
                            <Video size={12} aria-hidden="true" />
                            <span className="tabular-nums">
                              {camerasUp}/{busCameras.length}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1" title={`${busEvents.length} validated observations`}>
                            <ScanEye size={12} aria-hidden="true" />
                            <span className="tabular-nums">{busEvents.length}</span>
                          </span>
                        </span>
                        <span className="tabular-nums">{formatMinutesAgo(minutesAgo(bus.lastSeenAt, anchor))}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <GISMap
          className="xl:col-span-7 h-[480px] xl:h-full"
          ariaLabel="Fleet positions and routes"
          markers={mapMarkers}
          routeLines={networkRouteLines ?? []}
          stops={networkStops ?? []}
          highlightRoute={selectedShortName}
          highlightRouteId={selectedDemo?.gtfsRouteId ?? null}
          flyToSelection={!selectedRouteHasGeometry}
          selectedId={selectedId}
          drawerOpen={Boolean(selectedId)}
          hoveredId={hoveredId}
          onSelect={select}
          fitToMarkers
          overlay={
            selectedDemo ? (
              <MapDrawer
                title={
                  <span className="flex items-center gap-2">
                    {selectedDemo.busId}
                    <StatusBadge tone={selectedDemo.status === "active" ? "ok" : "watch"}>
                      {selectedDemo.status === "active" ? "Online" : "Idle"}
                    </StatusBadge>
                  </span>
                }
                onClose={() => setSelectedId(null)}
              >
                <SensingBusCard bus={demoBusView(selectedDemo)} />
              </MapDrawer>
            ) : (
              selected && (
              <MapDrawer
                title={
                  <span className="flex items-center gap-2">
                    {selected.label}
                    <StatusBadge tone={BUS_STATUS[selected.status].tone}>{BUS_STATUS[selected.status].label}</StatusBadge>
                  </span>
                }
                onClose={() => setSelectedId(null)}
              >
                <div className="flex flex-col gap-4">
                  <p className="text-body text-ink-2 -mt-1">
                    {selected.routeId.replace("BEST-", "Route ")}
                    {selectedRoute && ` · ${selectedRoute.origin} → ${selectedRoute.destination}`}
                  </p>
                  <div className="flex items-center gap-4 text-meta text-ink-3">
                    <span className="inline-flex items-center gap-1">
                      <Gauge size={13} aria-hidden="true" />
                      <span className="text-item text-ink tabular-nums">{selected.speedKph}</span> km/h
                    </span>
                    <span>Seen {formatMinutesAgo(minutesAgo(selected.lastSeenAt, anchor))}</span>
                    <SourceBadge source="simulated" />
                  </div>
                  <ul className="flex flex-col gap-1.5" aria-label="Cameras">
                    {selectedCameras.map((camera) => (
                      <li key={camera.cameraId} className="flex items-center justify-between gap-2 text-meta">
                        <span className="inline-flex items-center gap-1.5 text-ink-2 capitalize">
                          <Video size={13} aria-hidden="true" />
                          {camera.position.replace("-", " ")}
                        </span>
                        <StatusBadge tone={CAMERA_STATUS[camera.status].tone}>{CAMERA_STATUS[camera.status].label}</StatusBadge>
                      </li>
                    ))}
                    {selectedCameras.length === 0 && <li className="text-meta text-ink-3">No cameras registered</li>}
                  </ul>
                  {selectedClips.length > 0 && <DetectionPlayer clips={selectedClips} routeNames={routeNames} cameras={allCameras} />}
                  <ButtonLink to={`/fleet/${selected.busId}`} variant="primary" className="w-full">
                    Open bus
                  </ButtonLink>
                </div>
              </MapDrawer>
              )
            )
          }
        />
      </section>
    </>
  );
}
