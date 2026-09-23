import { MapPinned } from "lucide-react";
import { Panel, PanelHeader, EmptyState } from "../ui";
import { cn } from "../../lib/cn";
import type { Hotspot } from "../../lib/hotspots";
import type { TaxonomyBucket } from "../../lib/taxonomy";
import { TONE_CLASSES, categoryVisual } from "../../lib/visuals";

// Taxonomy bucket → a representative fixture category for its glyph.
const BUCKET_CATEGORY: Record<TaxonomyBucket, string> = {
  Pothole: "pothole",
  "Road Damage": "road-damage",
  Waterlogging: "waterlogging",
  "Traffic / Congestion": "congestion",
  "Pedestrian Safety": "pedestrian-conflict",
  Infrastructure: "signage",
  "Other Road Hazards": "other",
};

interface TopLocationsProps {
  hotspots: Hotspot[];
  selectedLocation?: string | null;
  onSelect?: (hotspot: Hotspot) => void;
  limit?: number;
  className?: string;
}

// Where signals concentrate: ranked areas, what kinds of signal, and how
// heavily each is corroborated. Selecting one flies the map there.
export function TopLocations({ hotspots, selectedLocation, onSelect, limit = 5, className }: TopLocationsProps) {
  const top = hotspots.slice(0, limit);
  const max = Math.max(1, ...top.map((h) => h.count));

  return (
    <Panel as="section" className={cn("p-4 flex flex-col gap-3", className)}>
      <PanelHeader title="Top locations" icon={MapPinned} meta="By corroborated signals" />
      {top.length === 0 ? (
        <EmptyState compact title="No hotspots yet" />
      ) : (
        <ol className="flex flex-col -mx-1">
          {top.map((hotspot) => {
            const selected = hotspot.location === selectedLocation;
            return (
              <li key={hotspot.location}>
                <button
                  type="button"
                  onClick={() => onSelect?.(hotspot)}
                  aria-pressed={selected}
                  className={cn(
                    "w-full grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_auto_120px_32px] items-center gap-x-3 gap-y-1 px-2 py-2 rounded-lg text-left transition-colors duration-150",
                    selected ? "bg-action-soft" : "hover:bg-surface-2",
                  )}
                >
                  <span className="text-item text-ink truncate">{hotspot.location}</span>
                  <span className="flex items-center gap-1 justify-self-end sm:justify-self-auto">
                    {hotspot.types.map((bucket) => {
                      const visual = categoryVisual(BUCKET_CATEGORY[bucket]);
                      const Icon = visual.icon;
                      return (
                        <span
                          key={bucket}
                          title={bucket}
                          className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md", TONE_CLASSES[visual.tone].soft, TONE_CLASSES[visual.tone].ink)}
                        >
                          <Icon size={13} strokeWidth={2} aria-label={bucket} />
                        </span>
                      );
                    })}
                  </span>
                  <span className="hidden sm:block h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                    <span className="block h-full rounded-full bg-action" style={{ width: `${(hotspot.count / max) * 100}%` }} />
                  </span>
                  <span className="hidden sm:block text-item text-ink tabular-nums text-right">{hotspot.count}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
