import { Activity } from "lucide-react";
import { Panel, PanelHeader, SourceBadge } from "../ui";
import { cn } from "../../lib/cn";
import { PULSE_DOMAINS, type CityPulse as CityPulseData } from "../../lib/pulse";
import { TONE_CLASSES } from "../../lib/visuals";

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// Small multiples — one bar row per domain on a shared scale — instead of
// one multi-colour area chart.
export function CityPulse({ pulse, className }: { pulse: CityPulseData | undefined; className?: string }) {
  const max = Math.max(1, ...(pulse?.series.flatMap((s) => s.bins) ?? [1]));
  const summary = pulse
    ? pulse.series.map((s) => `${s.total} ${s.domain}`).join(", ") + ` observations between ${clock(pulse.windowStart)} and ${clock(pulse.windowEnd)}`
    : "Loading";

  return (
    <Panel as="section" className={cn("p-4 flex flex-col gap-4", className)}>
      <PanelHeader
        title="City pulse"
        icon={Activity}
        meta={pulse ? `Last 60 min to ${clock(pulse.windowEnd)}` : undefined}
        actions={<SourceBadge source="simulated" />}
      />
      <div className="flex flex-col gap-3" role="img" aria-label={summary}>
        {PULSE_DOMAINS.map(({ key, label, tone }) => {
          const series = pulse?.series.find((s) => s.domain === key);
          return (
            <div key={key} className="grid grid-cols-[64px_1fr_28px] items-end gap-3">
              <span className="text-meta text-ink-2 pb-0.5">{label}</span>
              <div className="flex items-end gap-[3px] h-9">
                {(series?.bins ?? Array(12).fill(0)).map((value, i) => (
                  <span
                    key={i}
                    className={cn("flex-1 rounded-[2px]", value > 0 ? TONE_CLASSES[tone].solid : "bg-surface-2")}
                    style={{ height: value > 0 ? `${Math.max(18, (value / max) * 100)}%` : "3px" }}
                    title={`${value} in this 5 min`}
                  />
                ))}
              </div>
              <span className="text-item text-ink tabular-nums text-right pb-0.5">{series?.total ?? 0}</span>
            </div>
          );
        })}
        {pulse && (
          <div className="grid grid-cols-[64px_1fr_28px] gap-3 text-micro text-ink-3">
            <span />
            <div className="flex justify-between">
              <span>{clock(pulse.windowStart)}</span>
              <span>{clock(pulse.windowEnd)}</span>
            </div>
            <span />
          </div>
        )}
      </div>
    </Panel>
  );
}
