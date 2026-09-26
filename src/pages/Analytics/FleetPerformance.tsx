import { Link } from "react-router-dom";
import { StatusBadge } from "../../components/ui";
import { BUS_STATUS } from "../../lib/status";
import type { FleetContribution } from "../../services/analyticsService";

// Which buses and routes are feeding the pipeline. Compact and sortable by
// eye: observations carry an inline bar, corroborated counts show how much
// of a bus's output was confirmed by another bus.
export function FleetPerformance({ fleet }: { fleet: FleetContribution[] }) {
  const max = Math.max(1, ...fleet.map((b) => b.observations));
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <caption className="sr-only">Observations contributed per bus, sorted by observations</caption>
        <thead>
          <tr className="text-meta text-ink-3">
            <th scope="col" className="px-1 pb-2 font-medium">Bus</th>
            <th scope="col" className="px-1 pb-2 font-medium">Route</th>
            <th scope="col" className="px-1 pb-2 font-medium" aria-sort="descending">Observations</th>
            <th scope="col" className="px-1 pb-2 font-medium text-right">Corroborated</th>
            <th scope="col" className="px-1 pb-2 font-medium text-right">Avg. conf.</th>
            <th scope="col" className="px-1 pb-2 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {fleet.map((b) => {
            const status = BUS_STATUS[b.status];
            return (
              <tr key={b.busId} className="border-t border-line">
                <td className="px-1 py-2.5">
                  <Link to={`/fleet/${b.busId}`} className="text-item text-ink hover:text-action underline-offset-2 hover:underline">
                    {b.busId}
                  </Link>
                </td>
                <td className="px-1 py-2.5 text-body text-ink-2 whitespace-nowrap">{b.routeLabel}</td>
                <td className="px-1 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 text-item text-ink tabular-nums text-right">{b.observations}</span>
                    <span className="h-1.5 w-20 rounded-full bg-surface-2" aria-hidden="true">
                      <span className="block h-full rounded-full bg-action" style={{ width: `${(b.observations / max) * 100}%` }} />
                    </span>
                  </div>
                </td>
                <td className="px-1 py-2.5 text-body text-ink-2 tabular-nums text-right">{b.corroborated}</td>
                <td className="px-1 py-2.5 text-body text-ink tabular-nums text-right font-semibold">
                  {b.avgConfidence !== null ? `${b.avgConfidence}%` : <span className="text-ink-3 font-normal">—</span>}
                </td>
                <td className="px-1 py-2.5 text-right">
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
