import { PanelHeader, StatusBadge } from "../ui";

// PS §"detect and track the offending vehicle, extract the registration
// number... securely share alerts". No fixture, Event, or Issue in this
// codebase currently represents a rash-driving/hit-and-run/vehicle-incident
// detection — grep confirms zero plate/ANPR/tracking data anywhere in the
// mock layer. Rather than fabricate a sample incident (or a demo plate
// number/OCR confidence, which section 21 explicitly forbids), this shows
// the taxonomy as real-but-empty categories plus the intended detail
// structure with every unavailable field spelled out, so the UI is visibly
// ready for the real ANPR/tracking pipeline without pretending it exists.
export function VehicleIncidentPanel({ categoryCounts }: { categoryCounts: { label: string; count: number }[] }) {
  return (
    <div className="bg-surface-card rounded-lg border border-border-slate p-space-sm shadow-sm flex flex-col gap-space-sm">
      <PanelHeader
        title="Vehicle Incidents"
        icon="car_crash"
        meta={<span className="font-label-code text-label-code text-ink-muted">ANPR / Tracking &middot; Not Yet Connected</span>}
      />

      <div className="flex flex-wrap gap-1.5">
        {categoryCounts.map((entry) => (
          <span
            key={entry.label}
            className="rounded font-label-code text-label-code font-semibold px-space-sm py-1 border border-border-slate bg-surface-panel text-ink-secondary"
          >
            {entry.label} <span className="text-ink-muted">({entry.count})</span>
          </span>
        ))}
      </div>

      <p className="font-body-sm text-body-sm text-ink-muted">
        No rash-driving, hit-and-run, or vehicle-incident detections have been recorded yet — the fleet's cameras currently
        detect road/pedestrian/congestion events, not per-vehicle offending-driver behavior. The categories above exist
        per the problem statement; each will populate once that model and the ANPR/tracking pipeline are connected.
      </p>

      {/* Structure preview — not a real incident. Demonstrates the intended
          detail fields (section 15/6/7/8 of the phase brief) with every
          value explicitly marked unavailable rather than invented. */}
      <div className="border border-dashed border-border-slate rounded p-space-sm flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-eyebrow text-label-eyebrow text-ink-muted uppercase tracking-widest">
            Incident Structure Preview
          </span>
          <StatusBadge tone="info">No Active Incidents</StatusBadge>
        </div>
        <div className="grid grid-cols-2 gap-x-space-md gap-y-1 font-body-sm text-body-sm">
          <span className="text-ink-muted">Vehicle</span>
          <span className="text-ink-secondary text-right">Not available</span>
          <span className="text-ink-muted">Registration</span>
          <span className="text-ink-secondary text-right">Not available</span>
          <span className="text-ink-muted">OCR Confidence</span>
          <span className="text-ink-secondary text-right">&mdash;</span>
          <span className="text-ink-muted">Tracking</span>
          <span className="text-ink-secondary text-right">Awaiting multi-frame tracking evidence</span>
        </div>
      </div>
    </div>
  );
}
