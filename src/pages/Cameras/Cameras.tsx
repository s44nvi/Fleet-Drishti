import { PageHeader, Panel, DataTable, SourceBadge, StatusBadge } from "../../components/ui";
import { useAsyncData } from "../../hooks/useAsyncData";
import { fleetService } from "../../services";
import { CAMERA_STATUS } from "../../lib/status";
import type { Camera, DataTableColumn } from "../../types";

const columns: DataTableColumn<Camera>[] = [
  { key: "cameraId", header: "Camera", render: (camera) => <span className="text-item">{camera.cameraId}</span> },
  { key: "bus", header: "Bus", render: (camera) => camera.busId },
  { key: "position", header: "Position", render: (camera) => <span className="capitalize">{camera.position.replace(/-/g, " ")}</span> },
  { key: "resolution", header: "Resolution", render: (camera) => camera.resolution },
  { key: "fps", header: "FPS", render: (camera) => camera.fps, align: "right" },
  { key: "status", header: "Status", render: (camera) => <StatusBadge tone={CAMERA_STATUS[camera.status].tone}>{CAMERA_STATUS[camera.status].label}</StatusBadge> },
  { key: "heartbeat", header: "Last heartbeat", render: (camera) => new Date(camera.lastHeartbeatAt).toLocaleTimeString("en-IN"), align: "right" },
];

export function Cameras() {
  const { data: cameras, loading } = useAsyncData(() => fleetService.listCameras(), []);
  const all = cameras ?? [];
  const summary = (["online", "degraded", "offline"] as const)
    .map((status) => ({ status, count: all.filter((c) => c.status === status).length }))
    .filter((s) => s.count > 0)
    .map((s) => `${s.count} ${CAMERA_STATUS[s.status].label.toLowerCase()}`)
    .join(" · ");

  return (
    <>
      <PageHeader
        title="Cameras"
        context={
          <>
            <span className="tabular-nums">{summary}</span>
            <SourceBadge source="simulated" />
          </>
        }
      />
      <Panel className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-body text-ink-3">Loading cameras…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={all}
            getRowKey={(camera) => camera.cameraId}
            getRowHref={(camera) => `/fleet/${camera.busId}`}
            emptyLabel="No cameras registered."
          />
        )}
      </Panel>
    </>
  );
}
