import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Clock, MapPin, ScanEye } from "lucide-react";
import { SourceBadge } from "../ui";
import { cn } from "../../lib/cn";
import { TONE_HEX, categoryVisual } from "../../lib/visuals";
import type { Camera, DetectionBox, DetectionClip, DetectionFrame } from "../../types";

interface DetectionPlayerProps {
  clips: DetectionClip[];
  /** Controlled selection (e.g. from the live event list). */
  activeClipId?: string | null;
  onActiveChange?: (clipId: string) => void;
  /** routeId -> "Origin → Destination" for the header line. */
  routeNames?: Record<string, string>;
  cameras?: Camera[];
  /** Where the "open" link on the active clip goes, if anywhere. */
  linkFor?: (clip: DetectionClip) => string | undefined;
  className?: string;
  /** Hide the header row (when a page already titles the section). */
  bare?: boolean;
}

const CAMERA_POSITION_LABEL: Record<Camera["position"], string> = {
  front: "Front camera",
  "side-left": "Left camera",
  "side-right": "Right camera",
  rear: "Rear camera",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// The frame a video is showing — the latest frame at or before `time`,
// ignoring frames older than half a second so stale boxes don't linger.
function frameAt(frames: DetectionFrame[], time: number): DetectionFrame | undefined {
  let best: DetectionFrame | undefined;
  for (const frame of frames) {
    if (frame.t <= time + 0.02 && (!best || frame.t > best.t)) best = frame;
  }
  return best && time - best.t <= 0.5 ? best : undefined;
}

// Illustrative road perspective for DEMO frames — clearly a drawing, never a
// photo, so nobody mistakes it for footage.
function DemoBackdrop() {
  return (
    <svg viewBox="0 0 160 90" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect width="160" height="90" fill="#1b2638" />
      <rect y="0" width="160" height="38" fill="#223047" />
      <polygon points="58,38 102,38 160,90 0,90" fill="#28364d" />
      <g stroke="#3d4d66" strokeWidth="0.6" fill="none">
        <line x1="58" y1="38" x2="0" y2="90" />
        <line x1="102" y1="38" x2="160" y2="90" />
      </g>
      <g stroke="#56657d" strokeWidth="0.9" strokeDasharray="4 4">
        <line x1="80" y1="40" x2="80" y2="90" />
      </g>
      <line x1="0" y1="38" x2="160" y2="38" stroke="#34435a" strokeWidth="0.5" />
    </svg>
  );
}

function BoxOverlay({ boxes }: { boxes: DetectionBox[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {boxes.map((b, i) => {
        const visual = categoryVisual(b.label);
        const color = TONE_HEX[visual.tone];
        const labelBelow = b.box.y < 0.08;
        return (
          <div
            key={b.trackId ?? `${b.label}-${i}`}
            className="absolute rounded-[3px]"
            style={{
              left: `${b.box.x * 100}%`,
              top: `${b.box.y * 100}%`,
              width: `${b.box.width * 100}%`,
              height: `${b.box.height * 100}%`,
              border: `2px solid ${color}`,
              boxShadow: "0 0 0 1px rgb(0 0 0 / 0.25)",
            }}
          >
            <span
              className={cn(
                "absolute left-[-2px] whitespace-nowrap rounded-[3px] px-1.5 py-[1px] text-[11px] leading-[15px] font-bold text-white tabular-nums",
                labelBelow ? "top-full mt-0.5" : "bottom-full mb-0.5",
              )}
              style={{ backgroundColor: color }}
            >
              {visual.label} {b.confidence.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DetectionPlayer({
  clips,
  activeClipId,
  onActiveChange,
  routeNames = {},
  cameras = [],
  linkFor,
  className,
  bare,
}: DetectionPlayerProps) {
  const [internalId, setInternalId] = useState<string | null>(null);
  const currentId = activeClipId ?? internalId ?? clips[0]?.clipId ?? null;
  const index = Math.max(0, clips.findIndex((c) => c.clipId === currentId));
  const clip = clips[index];

  // Playback state is tied to the clip it was measured on, so switching
  // clips falls back to defaults without an effect.
  const [playback, setPlayback] = useState<{ clipId: string | null; time: number; aspect: number }>({
    clipId: null,
    time: 0,
    aspect: 16 / 9,
  });
  const onThisClip = playback.clipId === clip?.clipId;
  const videoTime = onThisClip ? playback.time : 0;
  const aspect = onThisClip ? playback.aspect : 16 / 9;
  const setVideoTime = (time: number) => setPlayback((p) => ({ clipId: clip?.clipId ?? null, time, aspect: p.clipId === clip?.clipId ? p.aspect : 16 / 9 }));
  const setAspect = (value: number) => setPlayback((p) => ({ clipId: clip?.clipId ?? null, time: p.clipId === clip?.clipId ? p.time : 0, aspect: value }));

  const boxes = useMemo(() => {
    if (!clip) return [];
    if (clip.media.kind === "video") return frameAt(clip.frames, videoTime)?.boxes ?? [];
    return clip.frames[0]?.boxes ?? [];
  }, [clip, videoTime]);

  // All classes seen anywhere in the clip, strongest confidence first — the
  // list under the frame, so a viewer can read the detections without
  // pausing on the right frame.
  const clipClasses = useMemo(() => {
    const best = new Map<string, number>();
    clip?.frames.forEach((f) => f.boxes.forEach((b) => best.set(b.label, Math.max(best.get(b.label) ?? 0, b.confidence))));
    return [...best.entries()].sort((a, b) => b[1] - a[1]);
  }, [clip]);

  function go(delta: number) {
    if (clips.length === 0) return;
    const next = clips[(index + delta + clips.length) % clips.length];
    setInternalId(next.clipId);
    onActiveChange?.(next.clipId);
  }

  if (!clip) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <div className="aspect-video rounded-xl bg-media flex flex-col items-center justify-center gap-2 text-white/70">
          <ScanEye size={28} aria-hidden="true" />
          <p className="text-meta">No detections to show yet</p>
        </div>
      </div>
    );
  }

  const camera = cameras.find((c) => c.cameraId === clip.cameraId);
  const cameraLabel = camera ? CAMERA_POSITION_LABEL[camera.position] : clip.cameraId;
  const routeName = clip.routeId ? routeNames[clip.routeId] : undefined;
  const routeShort = clip.routeId?.replace("BEST-", "Route ");
  const href = linkFor?.(clip);
  const sourceDetail =
    clip.source === "recorded" ? `${formatDate(clip.capturedAt)}, ${formatTime(clip.capturedAt)}` : undefined;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {!bare && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-title text-ink">AI detection</h2>
            <p className="text-meta text-ink-3 truncate">
              <span className="text-ink-2 font-semibold">{clip.busId}</span>
              {routeShort && <> · {routeShort}</>}
              {routeName && <> · {routeName}</>}
            </p>
          </div>
          {clips.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous detection"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-line text-ink-2 hover:bg-surface-2"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-micro text-ink-3 tabular-nums w-10 text-center" aria-live="polite">
                {index + 1} / {clips.length}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next detection"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-line text-ink-2 hover:bg-surface-2"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <figure className="relative overflow-hidden rounded-xl bg-media" style={{ aspectRatio: aspect }}>
        {clip.media.kind === "video" ? (
          <video
            key={clip.clipId}
            src={clip.media.url}
            poster={clip.media.poster}
            className="absolute inset-0 h-full w-full"
            muted
            playsInline
            controls
            loop
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
            }}
            onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
            onSeeked={(e) => setVideoTime(e.currentTarget.currentTime)}
          />
        ) : clip.media.kind === "image" ? (
          <img src={clip.media.url} alt={`${cameraLabel} frame from ${clip.busId}`} className="absolute inset-0 h-full w-full" />
        ) : (
          <DemoBackdrop />
        )}

        <BoxOverlay boxes={boxes} />

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <SourceBadge source={clip.source} detail={sourceDetail} onDark />
          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] leading-[14px] font-semibold text-white/90">{cameraLabel}</span>
        </div>
        {clip.source === "demo" && (
          <figcaption className="absolute bottom-2 left-2.5 right-2.5 text-[11px] leading-[14px] text-white/65">
            Illustrative frame · no footage attached · box from stored detection record
          </figcaption>
        )}
      </figure>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-ink-3">
        <span className="inline-flex items-center gap-1">
          <Clock size={13} aria-hidden="true" />
          <time dateTime={clip.capturedAt}>
            {formatDate(clip.capturedAt)}, {formatTime(clip.capturedAt)}
          </time>
        </span>
        <span className="inline-flex items-center gap-1 min-w-0">
          <MapPin size={13} aria-hidden="true" />
          <span className="truncate">{clip.location}</span>
        </span>
        {clip.model && (
          <span>
            {clip.model.name}
            {clip.model.version && ` ${clip.model.version}`}
          </span>
        )}
      </div>

      {clipClasses.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Detections in this clip">
          {clipClasses.map(([label, confidence]) => {
            const visual = categoryVisual(label);
            return (
              <li key={label} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TONE_HEX[visual.tone] }} aria-hidden="true" />
                <span className="text-item text-ink flex-1">{visual.label}</span>
                <span className="h-1.5 w-20 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                  <span className="block h-full rounded-full" style={{ width: `${confidence * 100}%`, backgroundColor: TONE_HEX[visual.tone] }} />
                </span>
                <span className="text-meta text-ink-2 tabular-nums w-9 text-right">{confidence.toFixed(2)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {href && (
        <Link to={href} className="text-meta font-semibold text-action hover:text-action-strong w-fit">
          Open observation
        </Link>
      )}
    </div>
  );
}
