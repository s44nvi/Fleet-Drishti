import { Link } from "react-router-dom";
import type { Bus, Detection, Event } from "../../types";

interface LiveAIObservationPanelProps {
  bus: Bus | undefined;
  event: Event | undefined;
  detection?: Detection;
  eventLinkTo?: string;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

// Demonstrates the sensing pipeline: bus camera -> AI detection -> event.
// The frame itself is always a placeholder (Fleet Drishti has no real video
// feed to embed) — but when the most recent event has a stored Detection,
// its real bounding box is drawn on top so the placeholder reads as an
// annotated demo frame rather than an unexplained blank rectangle.
// Deliberately excludes FPS/model-version/latency/hardware telemetry — the
// point is to show the mechanism, not to fabricate technical specs.
export function LiveAIObservationPanel({ bus, event, detection, eventLinkTo }: LiveAIObservationPanelProps) {
  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm h-full flex flex-col gap-space-sm">
      <div className="flex items-center justify-between pb-space-sm border-b border-border-slate">
        <span className="font-title-sm text-title-sm text-ink-primary font-bold">Live AI Observation</span>
        <Link to="/live-ai" className="font-label-code text-label-code font-semibold text-primary-civic-deep hover:text-primary-civic-active">
          Open Live AI Processing &rarr;
        </Link>
      </div>

      <div className="relative h-[150px] shrink-0 bg-inverse-surface rounded overflow-hidden flex items-center justify-center border border-border-slate">
        <div className="absolute top-2 left-2 font-label-code text-label-code text-white/90">
          {bus ? `${bus.label} · Front Camera` : "Fleet camera"}
        </div>
        <span className="absolute top-2 right-2 font-label-code text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/70">
          Demo Frame &middot; No Live Video
        </span>
        <span className="material-symbols-outlined text-white/20 text-[40px]">videocam</span>

        {detection && (
          <div
            className="absolute border-2 border-primary-civic-active/90 rounded-sm"
            style={{
              left: `${detection.boundingBox.x * 100}%`,
              top: `${detection.boundingBox.y * 100}%`,
              width: `${detection.boundingBox.width * 100}%`,
              height: `${detection.boundingBox.height * 100}%`,
            }}
          >
            <span className="absolute -top-5 left-0 whitespace-nowrap font-label-code text-[10px] font-bold uppercase px-1 py-0.5 rounded bg-primary-civic-active text-white">
              {titleCase(detection.objectClass)} {detection.confidence}%
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="material-symbols-outlined text-ink-secondary text-[22px]">directions_bus</span>
          <span className="font-label-code text-label-code text-ink-secondary">Bus Camera</span>
        </div>
        <span className="material-symbols-outlined text-ink-muted text-[18px]">arrow_forward</span>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="material-symbols-outlined text-ink-secondary text-[22px]">psychology</span>
          <span className="font-label-code text-label-code text-ink-secondary">AI Detection</span>
        </div>
        <span className="material-symbols-outlined text-ink-muted text-[18px]">arrow_forward</span>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="material-symbols-outlined text-ink-secondary text-[22px]">bolt</span>
          <span className="font-label-code text-label-code text-ink-secondary">Event</span>
        </div>
      </div>

      {event && (
        <Link
          to={eventLinkTo ?? `/fleet/${event.busId}`}
          className="flex items-center justify-between gap-space-sm px-space-sm py-1.5 rounded bg-surface-panel border border-border-slate hover:bg-surface-container-high transition-colors"
        >
          <span className="font-body-sm text-body-sm text-ink-primary font-semibold">{titleCase(event.subtype)} detected</span>
          <span className="font-label-code text-label-code text-ink-secondary">{event.confidence}% confidence</span>
        </Link>
      )}
    </div>
  );
}
