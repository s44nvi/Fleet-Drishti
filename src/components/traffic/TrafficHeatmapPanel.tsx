import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Panel, SourceBadge } from "../ui";
import { cn } from "../../lib/cn";
import { DAY_LABELS, DAY_NAMES, congestionColor, congestionWord, hourLabel } from "../../lib/congestionIndex";
import { TONE_CLASSES } from "../../lib/visuals";

interface TrafficHeatmapPanelProps {
  day: number;
  hour: number;
  onDayChange: (day: number) => void;
  onHourChange: (hour: number) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  /** City-average index per hour for the selected day. */
  byHour: number[];
  /** City-average index per day at the selected hour. */
  byDay: number[];
  className?: string;
}

type Mode = "time" | "day";

function pct(value: number, base: number) {
  if (base <= 0) return 0;
  return Math.round(((value - base) / base) * 100);
}

// Day chips + By time / By day analysis of the city congestion index, with
// the selected slot called out against its baseline.
export function TrafficHeatmapPanel({
  day,
  hour,
  onDayChange,
  onHourChange,
  playing,
  onPlayingChange,
  byHour,
  byDay,
  className,
}: TrafficHeatmapPanelProps) {
  const [mode, setMode] = useState<Mode>("time");

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => onHourChange((hour + 1) % 24), 700);
    return () => window.clearInterval(timer);
  }, [playing, hour, onHourChange]);

  const bars = mode === "time" ? byHour : byDay;
  const selectedIndex = mode === "time" ? hour : day;
  const value = bars[selectedIndex] ?? 0;
  const baseline = bars.length ? bars.reduce((a, b) => a + b, 0) / bars.length : 0;
  const delta = pct(value, baseline);
  const word = congestionWord(value);
  const slotLabel = mode === "time" ? `${hourLabel(hour)}–${hourLabel((hour + 1) % 24)}` : `${DAY_NAMES[day]}, ${hourLabel(hour)}`;
  const baselineLabel = mode === "time" ? "vs day average" : "vs week average at this hour";

  function pick(i: number) {
    onPlayingChange(false);
    if (mode === "time") onHourChange(i);
    else onDayChange(i);
  }

  return (
    <Panel as="section" className={cn("p-4 flex flex-col gap-3.5", className)} aria-label="Traffic heatmap by time and day">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-title text-ink">Traffic heatmap</h2>
          <p className="text-meta text-ink-3">Weekly congestion pattern · Mumbai corridors</p>
        </div>
        <SourceBadge source="demo" />
      </div>

      <div role="group" aria-label="Day of week" className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onDayChange(i)}
            aria-pressed={day === i}
            aria-label={DAY_NAMES[i]}
            className={cn(
              "h-8 rounded-full text-meta transition-colors duration-150",
              day === i ? "bg-action-soft text-action font-semibold ring-1 ring-action/40" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tablist" aria-label="Heatmap view" className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-0.5">
        {(
          [
            ["time", "By time"],
            ["day", "By day"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={cn(
              "h-8 rounded-md text-meta transition-colors duration-150",
              mode === key ? "bg-surface text-action font-semibold shadow-panel ring-1 ring-action/30" : "text-ink-3 hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPlayingChange(!playing)}
          aria-label={playing ? "Pause playback" : "Play through the day"}
          className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-action text-white hover:bg-action-strong"
        >
          {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0 rounded-lg border border-line px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-item text-ink tabular-nums">{slotLabel}</span>
            <span className={cn("text-micro", TONE_CLASSES[word.tone].ink)}>{word.label} congestion</span>
          </div>
          <p className="text-meta text-ink-3 tabular-nums">
            Index {Math.round(value * 100)} ·{" "}
            <span className={delta > 0 ? "text-alert-ink" : "text-ok-ink"}>
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>{" "}
            {baselineLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className={cn("flex items-end h-20", mode === "time" ? "gap-[3px]" : "gap-2")} aria-hidden="true">
          {bars.map((v, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => pick(i)}
              title={`${mode === "time" ? hourLabel(i) : DAY_NAMES[i]} · ${congestionWord(v).label} · ${Math.round(v * 100)}`}
              className={cn(
                "flex-1 rounded-t-[3px] transition-opacity duration-150",
                i === selectedIndex ? "opacity-100 outline-2 outline-offset-1 outline-ink" : "opacity-60 hover:opacity-100",
              )}
              style={{ height: `${Math.max(6, v * 100)}%`, backgroundColor: congestionColor(v) }}
            />
          ))}
        </div>
        {mode === "time" ? (
          <>
            <input
              type="range"
              min={0}
              max={23}
              step={1}
              value={hour}
              onChange={(e) => pick(Number(e.target.value))}
              aria-label="Hour of day"
              aria-valuetext={`${hourLabel(hour)}, ${word.label}`}
              className="w-full accent-[#1d5fe0] cursor-pointer"
            />
            <div className="flex justify-between text-micro text-ink-3 tabular-nums" aria-hidden="true">
              {["00", "04", "08", "12", "16", "20", "23"].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="flex gap-2 text-micro text-ink-3" aria-hidden="true">
            {DAY_LABELS.map((d) => (
              <span key={d} className="flex-1 text-center">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
