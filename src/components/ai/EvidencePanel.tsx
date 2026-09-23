import { StatusBadge } from "../ui";
import type { Evidence } from "../../types";

// Evidence thumbnailUrl values are mock references (mock://...), not real
// network resources — this intentionally never renders an <img src> against
// them, only a placeholder tile plus the evidence's metadata.
export function EvidencePanel({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return <p className="font-body-sm text-body-sm text-ink-muted">No evidence captured yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
      {evidence.map((item) => (
        <div key={item.evidenceId} className="border border-border-slate rounded overflow-hidden bg-surface-card">
          <div className="relative aspect-video bg-inverse-surface flex items-center justify-center">
            <span className="material-symbols-outlined text-white/30 text-[36px]">
              {item.type === "video-clip" ? "movie" : "image"}
            </span>
            {item.piiRedacted && (
              <span className="absolute top-1.5 right-1.5 font-label-code text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary-civic-deep text-white">
                PII Redacted
              </span>
            )}
          </div>
          <div className="p-space-sm flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-code text-label-code text-ink-primary font-semibold">{item.evidenceId}</span>
              <StatusBadge tone="info">{item.type === "video-clip" ? "Clip" : "Image"}</StatusBadge>
            </div>
            <span className="font-label-code text-label-code text-ink-muted">
              {item.busId} &bull; {item.cameraId}
            </span>
            <span className="font-label-code text-label-code text-ink-muted">
              {new Date(item.capturedAt).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
