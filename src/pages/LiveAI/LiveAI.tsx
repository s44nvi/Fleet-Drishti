import { useState } from "react";
import { ScanEye } from "lucide-react";
import { PageHeader, Panel, PanelHeader, SourceBadge, StatusBadge } from "../../components/ui";
import { DetectionPlayer } from "../../components/ai";
import { useAsyncData } from "../../hooks/useAsyncData";
import { eventService, fleetService, mediaService, routeService } from "../../services";
import { TONE_HEX, categoryVisual } from "../../lib/visuals";
import { cn } from "../../lib/cn";

function clock(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// AI detections: every raw detection record, and whether it was promoted to
// a validated observation. Promoted detections open in the player. No
// throughput/latency/model-health figures are shown — none exist in the data.
export function LiveAI() {
  const { data: detections, loading } = useAsyncData(() => eventService.listDetections(), []);
  const { data: clips } = useAsyncData(() => mediaService.listDetectionClips(), []);
  const { data: cameras } = useAsyncData(() => fleetService.listCameras(), []);
  const { data: routes } = useAsyncData(() => routeService.listRoutes(), []);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const sorted = [...(detections ?? [])].sort((a, b) => new Date(b.frameTimestamp).getTime() - new Date(a.frameTimestamp).getTime());
  const promoted = sorted.filter((d) => d.eventId).length;
  const routeNames = Object.fromEntries((routes ?? []).map((r) => [r.routeId, `${r.origin} → ${r.destination}`]));
  const activeClip = (clips ?? []).find((c) => c.clipId === activeClipId) ?? clips?.[0];

  return (
    <>
      <PageHeader
        title="AI detections"
        context={
          <>
            <span className="tabular-nums">
              {sorted.length} detections · {promoted} promoted to observations
            </span>
            <SourceBadge source="demo" detail="no footage attached" />
          </>
        }
      />

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <Panel as="section" className="xl:col-span-7 p-4" aria-label="Detection player">
          <DetectionPlayer
            clips={clips ?? []}
            activeClipId={activeClipId}
            onActiveChange={setActiveClipId}
            routeNames={routeNames}
            cameras={cameras ?? []}
          />
        </Panel>

        <Panel as="section" className="xl:col-span-5 flex flex-col" aria-label="Detection records">
          <PanelHeader className="px-4 pt-4 pb-2" title="Detection records" icon={ScanEye} meta={`${sorted.length}`} />
          {loading ? (
            <p className="p-6 text-body text-ink-3">Loading detections…</p>
          ) : (
            <ul className="px-2 pb-2">
              {sorted.map((d) => {
                const visual = categoryVisual(d.objectClass);
                const clip = (clips ?? []).find((c) => c.eventId && c.eventId === d.eventId);
                const selected = clip && clip.clipId === activeClip?.clipId;
                const body = (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: TONE_HEX[visual.tone] }} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-item text-ink">{visual.label}</p>
                      <p className="text-meta text-ink-3 truncate">
                        {d.busId} · {d.cameraId} · {clock(d.frameTimestamp)}
                      </p>
                    </div>
                    <span className="text-meta text-ink-2 tabular-nums">{(d.confidence / 100).toFixed(2)}</span>
                    {d.eventId ? <StatusBadge tone="ok">Promoted</StatusBadge> : <StatusBadge tone="neutral">Below threshold</StatusBadge>}
                  </>
                );
                const rowClass = cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                  selected ? "bg-action-soft ring-1 ring-action/30" : clip && "hover:bg-surface-2",
                );
                return (
                  <li key={d.detectionId}>
                    {clip ? (
                      <button type="button" className={rowClass} onClick={() => setActiveClipId(clip.clipId)} aria-pressed={selected}>
                        {body}
                      </button>
                    ) : (
                      <div className={rowClass}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>
    </>
  );
}
