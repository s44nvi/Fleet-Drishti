import { cn } from "../../lib/cn";
import { TONE_HEX, categoryVisual } from "../../lib/visuals";
import type { DetectionClip } from "../../types";

// Row-sized evidence thumbnail: the clip's poster/image when real media is
// attached, otherwise a schematic frame (dashed edge = demo) with the stored
// bounding box drawn in its category colour.
export function DetectionThumb({ clip, className }: { clip: DetectionClip | undefined; className?: string }) {
  const box = clip?.frames[0]?.boxes[0];
  const hasMedia = clip && clip.media.kind !== "none";
  const poster = clip?.media.kind === "image" ? clip.media.url : clip?.media.kind === "video" ? clip.media.poster : undefined;
  const label = clip ? `${clip.source === "demo" ? "Demo frame" : "Recorded frame"}${box ? `: ${categoryVisual(box.label).label} ${box.confidence.toFixed(2)}` : ""}` : "No frame";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "relative block h-11 w-[72px] shrink-0 overflow-hidden rounded-md bg-media",
        !hasMedia && "outline outline-1 outline-dashed outline-offset-[-3px] outline-white/25",
        className,
      )}
    >
      {poster ? (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 72 44" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <rect width="72" height="18" fill="#223047" />
          <polygon points="27,18 45,18 72,44 0,44" fill="#28364d" />
          <line x1="36" y1="19" x2="36" y2="44" stroke="#56657d" strokeWidth="0.8" strokeDasharray="2.5 2.5" />
        </svg>
      )}
      {box && (
        <span
          className="absolute rounded-[2px]"
          style={{
            left: `${box.box.x * 100}%`,
            top: `${box.box.y * 100}%`,
            width: `${Math.max(box.box.width * 100, 8)}%`,
            height: `${Math.max(box.box.height * 100, 10)}%`,
            border: `1.5px solid ${TONE_HEX[categoryVisual(box.label).tone]}`,
          }}
        />
      )}
    </span>
  );
}
