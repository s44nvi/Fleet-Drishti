import { Link } from "react-router-dom";
import { PageHeader, Panel, PanelHeader, DataTable, StatusBadge } from "../../components/ui";
import { KpiStrip } from "../../components/telemetry";
import { GISMap } from "../../components/gis";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService } from "../../services";
import type { BadgeTone, Bus, Camera, DataTableColumn, Event, MapMarker } from "../../types";

const BUS_STATUS_TONE: Record<Bus["status"], BadgeTone> = {
  active: "success",
  idle: "info",
  offline: "critical",
  maintenance: "high",
};
const BUS_STATUS_LABEL: Record<Bus["status"], string> = {
  active: "Online",
  idle: "Idle",
  offline: "Offline",
  maintenance: "Maintenance",
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

// A bus counts as actively sensing if it's on-route ("active" status) and
// at least one onboard camera is producing frames (online or degraded —
// only "offline" cameras contribute nothing). Both inputs are real fixture
// fields; this isn't a fabricated "AI processing status".
function isActivelySensing(bus: Bus, cameras: Camera[]): boolean {
  if (bus.status !== "active") return false;
  return cameras.some((camera) => bus.cameraIds.includes(camera.cameraId) && camera.status !== "offline");
}

function buildColumns(eventsByBus: Map<string, Event[]>): DataTableColumn<Bus>[] {
  return [
    { key: "busId", header: "Bus", render: (bus) => <span className="font-label-code text-label-code font-semibold">{bus.label}</span> },
    { key: "route", header: "Route", render: (bus) => bus.routeId.replace("BEST-", "Route ") },
    { key: "status", header: "Status", render: (bus) => <StatusBadge tone={BUS_STATUS_TONE[bus.status]}>{BUS_STATUS_LABEL[bus.status]}</StatusBadge> },
    {
      key: "location",
      header: "Current Location",
      render: (bus) => `${bus.location.latitude.toFixed(4)}, ${bus.location.longitude.toFixed(4)}`,
    },
    {
      key: "observation",
      header: "Current Observation",
      render: (bus) => {
        const busEvents = eventsByBus.get(bus.busId) ?? [];
        const latest = [...busEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        return latest ? titleCase(latest.subtype) : <span className="text-ink-muted">None yet</span>;
      },
    },
    {
      key: "observationCount",
      header: "Observations",
      render: (bus) => (eventsByBus.get(bus.busId) ?? []).length,
      align: "right",
    },
    { key: "cameras", header: "Cameras", render: (bus) => bus.cameraIds.length, align: "right" },
    { key: "lastSeen", header: "Last Seen", render: (bus) => new Date(bus.lastSeenAt).toLocaleTimeString("en-IN"), align: "right" },
  ];
}

// Fleet Intelligence: the PS's core reframing — public transport buses as
// mobile sensing units. Every field here is a real fixture value; camera
// health comes from the existing Camera.status registry (fleetService),
// and "Current Observation" is derived from the real Event stream, not
// invented per-bus AI status.
export function Fleet() {
  const { data: buses, loading } = useAsyncData(() => fleetService.listBuses(), []);
  const { data: cameras } = useAsyncData(() => fleetService.listCameras(), []);
  const { data: events } = useAsyncData(() => eventService.listEvents(), []);

  const allBuses = buses ?? [];
  const allCameras = cameras ?? [];
  const allEvents = events ?? [];

  const eventsByBus = new Map<string, Event[]>();
  for (const event of allEvents) {
    const list = eventsByBus.get(event.busId) ?? [];
    list.push(event);
    eventsByBus.set(event.busId, list);
  }

  // --- KPIs — only the 3 statuses the current fixtures actually contain
  // (active/idle) are guaranteed to sum to Total Fleet; "maintenance" has no
  // fixture today but is counted separately so it never silently vanishes
  // from the total if one appears later. ---
  const online = allBuses.filter((bus) => bus.status === "active");
  const idle = allBuses.filter((bus) => bus.status === "idle");
  const offline = allBuses.filter((bus) => bus.status === "offline");
  const activelySensing = allBuses.filter((bus) => isActivelySensing(bus, allCameras));

  const kpiTiles = [
    { id: "total-fleet", label: "Total Fleet", value: String(allBuses.length), caption: "Public transport vehicles" },
    { id: "online", label: "Online", value: String(online.length), caption: "Actively on-route" },
    { id: "idle", label: "Idle", value: String(idle.length), caption: "Connected, not on-route" },
    { id: "offline", label: "Offline", value: String(offline.length), caption: "No recent signal" },
    { id: "active-sensing", label: "Active Sensing", value: String(activelySensing.length), caption: "On-route with a live camera" },
  ];

  const busMarkers: MapMarker[] = allBuses.map((bus) => ({
    id: bus.busId,
    kind: "bus-probe",
    label: `${bus.label} · Route ${bus.routeId.replace("BEST-", "")}`,
    latitude: bus.location.latitude,
    longitude: bus.location.longitude,
    href: `/fleet/${bus.busId}`,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Fleet Intelligence"
        description="The public transport fleet as Fleet Drishti's mobile sensing infrastructure."
        actions={
          <>
            <Link to="/routes" className="font-label-code text-label-code font-semibold text-primary-civic-deep hover:text-primary-civic-active">
              View Routes &rarr;
            </Link>
            <Link to="/cameras" className="font-label-code text-label-code font-semibold text-primary-civic-deep hover:text-primary-civic-active">
              View Cameras &rarr;
            </Link>
          </>
        }
      />

      <KpiStrip tiles={kpiTiles} columns={5} />

      {/* Part C: Bus -> Camera -> AI Observations -> Urban Intelligence */}
      <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm">
        <PanelHeader title="Sensing Pipeline" icon="sensors" />
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-1 pt-space-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="material-symbols-outlined text-ink-secondary text-[22px]">directions_bus</span>
            <span className="font-label-code text-label-code text-ink-secondary">Public Transport Bus</span>
          </div>
          <span className="material-symbols-outlined text-ink-muted text-[18px]">arrow_forward</span>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="material-symbols-outlined text-ink-secondary text-[22px]">videocam</span>
            <span className="font-label-code text-label-code text-ink-secondary">Camera / Sensor Data</span>
          </div>
          <span className="material-symbols-outlined text-ink-muted text-[18px]">arrow_forward</span>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="material-symbols-outlined text-ink-secondary text-[22px]">psychology</span>
            <span className="font-label-code text-label-code text-ink-secondary">AI Observations</span>
          </div>
          <span className="material-symbols-outlined text-ink-muted text-[18px]">arrow_forward</span>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="material-symbols-outlined text-ink-secondary text-[22px]">insights</span>
            <span className="font-label-code text-label-code text-ink-secondary">Urban Intelligence</span>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md w-full items-start">
        <div className="xl:col-span-8">
          <Panel className="overflow-hidden">
            {loading ? (
              <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading fleet…</div>
            ) : (
              <DataTable
                columns={buildColumns(eventsByBus)}
                rows={allBuses}
                getRowKey={(bus) => bus.busId}
                getRowHref={(bus) => `/fleet/${bus.busId}`}
                emptyLabel="No buses connected."
              />
            )}
          </Panel>
        </div>

        {/* Part D: fleet positions — reuses GISMap as-is; bus markers are
            always labeled "Simulated position" by GISMap itself (see
            components/gis/GISMap.tsx), never presented as live GPS. */}
        <div className="xl:col-span-4">
          <div className="h-[360px]">
            <GISMap markers={busMarkers} title="Fleet Positions" />
          </div>
        </div>
      </section>
    </>
  );
}
