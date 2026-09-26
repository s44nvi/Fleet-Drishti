import { Link } from "react-router-dom";
import { VideoOff } from "lucide-react";
import { PageHeader, SourceBadge } from "../../components/ui";
import { DetectionThumb } from "../../components/ai";
import { useAsyncData } from "../../hooks/useAsyncData";
import { fleetService, mediaService } from "../../services";
import { CAMERA_STATUS } from "../../lib/status";
import type { Camera, DetectionClip } from "../../types";

// Cameras: every bus camera as a large visual card. The frame carries the
// only status marker (RECORDED / DEMO / NO SIGNAL); under it, just the
// camera and the bus + route it rides on.
export function Cameras() {
  const { data: cameras, loading } = useAsyncData(() => fleetService.listCameras(), []);
  const { data: buses } = useAsyncData(() => fleetService.listBuses(), []);
  const { data: clips } = useAsyncData(() => mediaService.listDetectionClips(), []);
  const all = cameras ?? [];
  const summary = (["online", "degraded", "offline"] as const)
    .map((status) => ({ status, count: all.filter((c) => c.status === status).length }))
    .filter((s) => s.count > 0)
    .map((s) => `${s.count} ${CAMERA_STATUS[s.status].label.toLowerCase()}`)
    .join(" · ");

  // Latest frame per camera, preferring real recorded footage over demo.
  function clipFor(camera: Camera): DetectionClip | undefined {
    const own = (clips ?? []).filter((c) => c.cameraId === camera.cameraId);
    return own.find((c) => c.source === "recorded") ?? own[0];
  }
  const routeLabel = (busId: string) => {
    const routeId = buses?.find((b) => b.busId === busId)?.routeId;
    return routeId ? routeId.replace(/^BEST-/, "Route ") : null;
  };

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
      {loading ? (
        <p className="p-6 text-body text-ink-3">Loading cameras…</p>
      ) : all.length === 0 ? (
        <p className="p-6 text-body text-ink-3">No cameras registered.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Bus cameras">
          {all.map((camera) => {
            const offline = camera.status === "offline";
            const clip = offline ? undefined : clipFor(camera);
            const route = routeLabel(camera.busId);
            return (
              <li key={camera.cameraId}>
                <Link to={`/fleet/${camera.busId}`} className="group block rounded-xl focus-visible:outline-offset-4">
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-media transition-shadow duration-150 group-hover:shadow-float">
                    {offline ? (
                      <div className="absolute inset-0 flex items-center justify-center text-white/35" aria-label="No signal">
                        <VideoOff size={36} strokeWidth={1.5} aria-hidden="true" />
                      </div>
                    ) : (
                      <DetectionThumb clip={clip} className="absolute inset-0 h-full w-full rounded-none" />
                    )}
                    <span className="absolute left-3 top-3">
                      {offline ? (
                        <span className="inline-flex items-center rounded bg-black/55 px-1.5 py-0.5 text-[10px] leading-[14px] font-bold tracking-[0.06em] text-white">
                          NO SIGNAL
                        </span>
                      ) : (
                        <SourceBadge source={clip?.source === "recorded" ? "recorded" : "demo"} onDark />
                      )}
                    </span>
                  </div>
                  <p className="mt-2.5 text-item text-ink group-hover:text-action">{camera.cameraId}</p>
                  <p className="text-meta text-ink-3">{route ? `${camera.busId} · ${route}` : camera.busId}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
