import { PageHeader, Panel, DataTable, StatusBadge } from "../../components/ui";
import { useAsyncData } from "../../hooks/useAsyncData";
import { fleetService } from "../../services";
import type { BadgeTone, Camera, DataTableColumn } from "../../types";

const CAMERA_STATUS_TONE: Record<Camera["status"], BadgeTone> = {
  online: "success",
  degraded: "high",
  offline: "critical",
};

const columns: DataTableColumn<Camera>[] = [
  { key: "cameraId", header: "Camera", render: (camera) => <span className="font-label-code text-label-code font-semibold">{camera.cameraId}</span> },
  { key: "bus", header: "Bus", render: (camera) => camera.busId },
  { key: "position", header: "Position", render: (camera) => <span className="capitalize">{camera.position.replace(/-/g, " ")}</span> },
  { key: "resolution", header: "Resolution", render: (camera) => camera.resolution },
  { key: "fps", header: "FPS", render: (camera) => camera.fps, align: "right" },
  { key: "status", header: "Status", render: (camera) => <StatusBadge tone={CAMERA_STATUS_TONE[camera.status]}>{camera.status}</StatusBadge> },
  { key: "heartbeat", header: "Last Heartbeat", render: (camera) => new Date(camera.lastHeartbeatAt).toLocaleTimeString("en-IN"), align: "right" },
];

export function Cameras() {
  const { data: cameras, loading } = useAsyncData(() => fleetService.listCameras(), []);

  return (
    <>
      <PageHeader eyebrow="Fleet" title="Camera Monitoring" description="Edge camera availability and sensor health across the fleet." />
      <Panel className="overflow-hidden">
        {loading ? (
          <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading cameras…</div>
        ) : (
          <DataTable
            columns={columns}
            rows={cameras ?? []}
            getRowKey={(camera) => camera.cameraId}
            getRowHref={(camera) => `/fleet/${camera.busId}`}
            emptyLabel="No cameras registered."
          />
        )}
      </Panel>
    </>
  );
}
