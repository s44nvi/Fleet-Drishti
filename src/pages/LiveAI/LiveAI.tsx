import { PageHeader, Panel, PanelHeader, DataTable, StatusBadge } from "../../components/ui";
import { EdgePipelinePanel } from "../../components/ai";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService } from "../../services";
import type { DataTableColumn, Detection, PipelineStepData } from "../../types";

// This screen simulates the edge inference stream from mock fixtures. It is
// deliberately structured around eventService.listDetections() — a single
// data-fetching call — so that swapping the mock body for a live
// WebSocket/SSE subscription later only changes src/services/eventService.ts,
// not this page or the DataTable/EdgePipelinePanel components it renders.
const PIPELINE_STEPS: PipelineStepData[] = [
  { id: "p1", order: 1, label: "Video Ingestion", status: "complete", detail: "60fps" },
  { id: "p2", order: 2, label: "Frame Analysis", status: "complete", detail: "18.2ms" },
  { id: "p3", order: 3, label: "Object Detection", status: "complete", detail: "4 BBoxes" },
  { id: "p4", order: 4, label: "Tracking & Spatial Filter", status: "complete", detail: "Dedupe OK" },
  { id: "p5", order: 5, label: "Event Generation", status: "complete", detail: "Complete" },
  { id: "p6", order: 6, label: "Metadata Attached", status: "complete", detail: "GPS Valid" },
  { id: "p7", order: 7, label: "Synced to City Platform", status: "complete", detail: "Synced" },
];

const columns: DataTableColumn<Detection>[] = [
  { key: "detectionId", header: "Detection", render: (d) => <span className="font-label-code text-label-code font-semibold">{d.detectionId}</span> },
  { key: "bus", header: "Bus", render: (d) => d.busId },
  { key: "camera", header: "Camera", render: (d) => d.cameraId },
  { key: "class", header: "Object Class", render: (d) => <span className="capitalize">{d.objectClass.replace(/-/g, " ")}</span> },
  { key: "confidence", header: "Confidence", render: (d) => `${d.confidence}%`, align: "right" },
  {
    key: "status",
    header: "Pipeline Outcome",
    render: (d) => (d.eventId ? <StatusBadge tone="success">Promoted to Event</StatusBadge> : <StatusBadge tone="info">Below Threshold</StatusBadge>),
  },
];

export function LiveAI() {
  const { data: detections, loading } = useAsyncData(() => eventService.listDetections(), []);
  const { data: buses } = useAsyncData(() => fleetService.listBuses(), []);
  const primaryBus = buses?.[0];

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Live Edge-AI Processing"
        description="Live inference pipeline telemetry from edge compute nodes."
      />

      <EdgePipelinePanel
        feedLabel={primaryBus ? `${primaryBus.label} · Route ${primaryBus.routeId.replace("BEST-", "")} · Front Cam` : "Fleet camera"}
        statusLabel="Processing"
        steps={PIPELINE_STEPS}
      />

      <Panel className="overflow-hidden">
        <div className="p-space-sm">
          <PanelHeader title="Raw Detection Stream" icon="sensors" meta={<span className="font-label-code text-label-code text-ink-muted">Detection -&gt; Event promotion</span>} />
        </div>
        {loading ? (
          <div className="p-space-lg text-center font-body-sm text-body-sm text-ink-muted">Loading detection stream…</div>
        ) : (
          <DataTable columns={columns} rows={detections ?? []} getRowKey={(d) => d.detectionId} emptyLabel="No detections yet." />
        )}
      </Panel>
    </>
  );
}
