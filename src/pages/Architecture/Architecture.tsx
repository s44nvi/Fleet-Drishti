import { Fragment } from "react";
import { BrainCircuit, Bus, Camera, ChevronRight, Landmark, MapPinned, ScanEye, Workflow } from "lucide-react";
import { IconTile, PageHeader, Panel } from "../../components/ui";
import type { Tone } from "../../lib/visuals";

// The sensing pipeline as a sequence — this content genuinely is ordered,
// so it's drawn as one.
const STAGES: { label: string; detail: string; icon: typeof Bus; tone: Tone }[] = [
  { label: "Bus", detail: "Public transport fleet", icon: Bus, tone: "ok" },
  { label: "Camera", detail: "Onboard sensors", icon: Camera, tone: "neutral" },
  { label: "AI detection", detail: "Objects and events per frame", icon: BrainCircuit, tone: "action" },
  { label: "GPS + time", detail: "Where and when", icon: MapPinned, tone: "action" },
  { label: "Observation", detail: "Validated per-bus event", icon: ScanEye, tone: "action" },
  { label: "Corroboration", detail: "Fused across buses", icon: Workflow, tone: "watch" },
  { label: "Urban intelligence", detail: "Issues, patterns, action", icon: Landmark, tone: "alert" },
];

export function Architecture() {
  return (
    <>
      <PageHeader title="How Fleet Drishti works" context="From a bus camera to civic action" />
      <Panel className="p-6">
        <ol className="flex flex-col lg:flex-row lg:items-stretch gap-3">
          {STAGES.map((stage, i) => (
            <Fragment key={stage.label}>
              <li className="flex lg:flex-col items-center lg:items-start gap-3 lg:flex-1 rounded-xl border border-line bg-surface-2/60 p-4">
                <IconTile icon={stage.icon} tone={stage.tone} size="lg" />
                <div>
                  <p className="text-item text-ink">{stage.label}</p>
                  <p className="text-meta text-ink-3">{stage.detail}</p>
                </div>
              </li>
              {i < STAGES.length - 1 && (
                <li aria-hidden="true" className="flex items-center justify-center text-ink-3 rotate-90 lg:rotate-0">
                  <ChevronRight size={18} />
                </li>
              )}
            </Fragment>
          ))}
        </ol>
      </Panel>
    </>
  );
}
