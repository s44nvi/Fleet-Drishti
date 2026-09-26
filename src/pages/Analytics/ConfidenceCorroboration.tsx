import type { AnalyticsSnapshot } from "../../services/analyticsService";

const RING = 124;
const RING_STROKE = 12;

// Reliability, read three ways: the average model confidence (ring), how
// much of what was validated was independently seen by more than one bus
// (bars), and where every raw detection sat on the confidence scale — the
// ones validation dropped are drawn hollow, so the filter is visible.
export function ConfidenceCorroboration({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const r = (RING - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  const validated = snapshot.validatedObservations;
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

  const bars = [
    { label: "Single-bus observations", value: snapshot.singleBusObservations, share: pct(snapshot.singleBusObservations, validated), color: "#8fa3bf", of: "of validated" },
    { label: "Multi-bus corroborated", value: snapshot.corroboratedObservations, share: pct(snapshot.corroboratedObservations, validated), color: "#16a34a", of: "of validated" },
    { label: "Validated by rules", value: validated, share: pct(validated, snapshot.rawDetections), color: "#1d5fe0", of: "of raw detections" },
  ];

  const sorted = [...snapshot.detectionConfidences].sort((a, b) => a.confidence - b.confidence);
  const dropped = sorted.filter((d) => !d.promoted);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0" style={{ width: RING, height: RING }}>
          <svg width={RING} height={RING} className="-rotate-90" role="img" aria-label={`Average detection confidence ${snapshot.avgConfidence}%`}>
            <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke="#e8f6ee" strokeWidth={RING_STROKE} />
            <circle
              cx={RING / 2}
              cy={RING / 2}
              r={r}
              fill="none"
              stroke="#16a34a"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${(snapshot.avgConfidence / 100) * c} ${c}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
            <span className="text-[28px] leading-8 font-extrabold tracking-tight text-ink tabular-nums">{snapshot.avgConfidence}%</span>
            <span className="text-micro text-ink-3 font-medium">Avg. confidence</span>
          </div>
        </div>
        <ul className="w-full flex flex-col gap-3.5">
          {bars.map((b) => (
            <li key={b.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-body text-ink-2">{b.label}</span>
                <span className="text-body tabular-nums">
                  <span className="font-bold text-ink">{b.share}%</span>
                  <span className="text-ink-3"> · {b.value}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-surface-2" role="img" aria-label={`${b.label}: ${b.value}, ${b.share}% ${b.of}`}>
                <div className="h-full rounded-full" style={{ width: `${b.share}%`, background: b.color }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-item text-ink">Where raw detections scored</p>
          <p className="text-meta text-ink-3">
            {dropped.length} of {snapshot.rawDetections} dropped by validation
          </p>
        </div>
        <div
          className="relative mt-4 h-9"
          role="img"
          aria-label={`Raw detection confidence: promoted ${sorted.filter((d) => d.promoted).map((d) => `${d.confidence}%`).join(", ")}; dropped ${dropped.map((d) => `${d.confidence}%`).join(", ")}`}
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
          {sorted.map((d, i) => (
            <span
              key={d.detectionId}
              title={`${d.detectionId} · ${d.confidence}% · ${d.promoted ? "promoted" : "dropped"}`}
              className={
                d.promoted
                  ? "absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-action ring-2 ring-surface"
                  : "absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-ink-3 bg-surface"
              }
              // Alternate rows so close scores don't overlap.
              style={{ left: `${d.confidence}%`, top: i % 2 ? 20 : 2 }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-micro text-ink-3 font-medium tabular-nums" aria-hidden="true">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink-3" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-action" /> Promoted to observation
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-ink-3" /> Dropped
          </span>
        </div>
      </div>
    </div>
  );
}
