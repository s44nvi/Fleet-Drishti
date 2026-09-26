import type { ReactNode } from "react";
import { SourceBadge, StatusBadge } from "../ui";
import type { SensingBusView } from "../../lib/sensingBus";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr] gap-3 py-1.5 text-meta">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

// The same sensing-bus facts wherever a bus is opened (map popup, drawer).
// The source badge always says whether the position is SIMULATED (fixture
// fleet) or DEMO (density layer) — never implies GPS.
export function SensingBusCard({ bus, compact }: { bus: SensingBusView; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {compact && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-item text-ink">{bus.busId}</p>
          <StatusBadge tone={bus.status.tone}>{bus.status.label}</StatusBadge>
        </div>
      )}
      <p className="text-meta text-ink-2">
        <span className="font-semibold text-ink">
          {bus.agencyId} · Route {bus.routeShortName}
        </span>
        {bus.routeLongName && <span className="block text-ink-3">{bus.routeLongName}</span>}
      </p>
      <dl className="divide-y divide-line">
        <Row label="Sensing">{bus.status.label}</Row>
        <Row label="Cameras">{bus.cameras}</Row>
        <Row label="AI processing">{bus.aiProcessing}</Row>
        <Row label="Latest observation">{bus.latestObservation ?? <span className="text-ink-3">None</span>}</Row>
        <Row label="Confidence">{bus.confidence !== null ? `${bus.confidence}%` : <span className="text-ink-3">—</span>}</Row>
        <Row label="Last location">{bus.lastLocation}</Row>
      </dl>
      <div className="flex items-center gap-2 text-micro text-ink-3">
        <SourceBadge source={bus.positionSource === "DEMO" ? "demo" : "simulated"} />
        {bus.positionSource === "DEMO" ? "Illustrative bus on a real GTFS route — not GPS" : "Fixture fleet · simulated position"}
      </div>
    </div>
  );
}
