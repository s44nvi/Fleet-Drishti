import { cn } from "../../lib/cn";

export type DataSource = "live" | "recorded" | "demo" | "simulated";

// Strict semantics — see design-system/fleet-drishti/MASTER.md §8:
//  live      a real, current stream backs this element (nothing qualifies today)
//  recorded  real captured footage / model output from the past
//  demo      an illustrative placeholder or generated pattern
//  simulated fixture-driven simulated fleet / state
const SOURCE_STYLE: Record<DataSource, { label: string; className: string; title: string }> = {
  live: {
    label: "LIVE",
    className: "bg-alert text-white",
    title: "Streaming from a real, current source",
  },
  recorded: {
    label: "RECORDED",
    className: "bg-ink text-white",
    title: "Real recorded footage and model output",
  },
  demo: {
    label: "DEMO",
    className: "border border-dashed border-ink-3 text-ink-2 bg-surface",
    title: "Illustrative demo data — not a measurement",
  },
  simulated: {
    label: "SIMULATED",
    className: "bg-surface-2 text-ink-2 border border-line",
    title: "Simulated fleet data from fixtures",
  },
};

interface SourceBadgeProps {
  source: DataSource;
  /** Short context after the label, e.g. capture time. */
  detail?: string;
  className?: string;
  /** For use over dark media. */
  onDark?: boolean;
}

export function SourceBadge({ source, detail, className, onDark }: SourceBadgeProps) {
  const style = SOURCE_STYLE[source];
  return (
    <span
      title={style.title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] leading-[14px] font-bold tracking-[0.06em] whitespace-nowrap",
        onDark && source === "demo" ? "border border-dashed border-white/60 text-white bg-black/30" : style.className,
        onDark && source === "simulated" && "bg-black/40 text-white border-white/20",
        className,
      )}
    >
      {source === "live" && <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" aria-hidden="true" />}
      {style.label}
      {detail && <span className="font-medium tracking-normal opacity-80">{detail}</span>}
    </span>
  );
}
