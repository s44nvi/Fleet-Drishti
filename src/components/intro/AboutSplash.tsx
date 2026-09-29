import { TriangleAlert, Bus, BrainCircuit, X } from "lucide-react";
import { cn } from "../../lib/cn";

interface AboutSplashProps {
  onDismiss: () => void;
}

interface Stop {
  icon: typeof TriangleAlert;
  eyebrow: string;
  body: string;
}

// Problem -> Solution -> Approach, presented as three stops on a route
// line — echoing the sidebar's own route/skyline visual language
// (MumbaiLineArt / SidebarCityBranding) rather than inventing new
// iconography. Icons are ones already used elsewhere in the app
// (TriangleAlert: RoadIssues/Infrastructure hazard callouts, Bus: Fleet/
// RouteDetail, BrainCircuit: Architecture's edge-AI diagram).
const STOPS: Stop[] = [
  {
    icon: TriangleAlert,
    eyebrow: "The problem",
    body: "Civic reporting is manual, slow, and disconnected from where the actual risk is.",
  },
  {
    icon: Bus,
    eyebrow: "Our solution",
    body: "Cameras already mounted on public buses become a live, city-wide sensing network.",
  },
  {
    icon: BrainCircuit,
    eyebrow: "Our approach",
    body: "Edge AI detects each pass; repeated sightings fuse into one confirmed, prioritized issue.",
  },
];

// Demo-only splash, shown before the real app when triggered via
// ?intro=1 (see App.tsx). Built entirely from the site's real design
// tokens (index.css @theme) — canvas/surface/ink palette, the
// text-page-title/text-page-subtitle scale PageHeader uses, and the
// --color-civic route-line tone from the sidebar's MumbaiLineArt — so it
// reads as the same product rather than a separately styled page.
export function AboutSplash({ onDismiss }: AboutSplashProps) {
  return (
    <div
      role="dialog"
      aria-label="About Fleet Drishti"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canvas px-4 py-10 sm:px-6"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close introduction"
        className="fixed right-4 top-4 h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <X size={16} />
      </button>

      {/* Stop propagation so clicking the card itself doesn't feel like a
          misclick dismissal — only the surrounding canvas and the X do. */}
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
        <p className="text-item font-semibold text-action">Fleet Drishti</p>
        <h1 className="mt-2 text-page-title-sm sm:text-page-title text-balance text-ink">
          Road defects and hazards go unreported until someone gets hurt — we turn the buses already on the road into
          the fix.
        </h1>

        <ol className="mt-8 border-l-2 border-civic/40 pl-6 sm:pl-8">
          {STOPS.map(({ icon: Icon, eyebrow, body }, i) => (
            <li key={eyebrow} className={cn("relative", i > 0 && "mt-6")}>
              <span
                aria-hidden="true"
                className="absolute -left-[calc(1.5rem+9px)] sm:-left-[calc(2rem+9px)] top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-civic text-white"
              >
                <Icon size={11} strokeWidth={2.5} />
              </span>
              <p className="text-micro font-semibold uppercase tracking-wide text-civic">{eyebrow}</p>
              <p className="mt-1 text-page-subtitle-sm sm:text-page-subtitle text-ink-2">{body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-1 border-t border-line pt-4 text-meta text-ink-3">
          <p>Edge → Cloud — compact event packets, not raw video</p>
          <p>Multi-bus fusion — confidence builds with every pass</p>
        </div>

        <div className="mt-8 text-meta text-ink-3">
          <p>Smart India Hackathon 2026</p>
          <p>Team Purple Hand Gang</p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-8 inline-flex items-center gap-1.5 rounded-md bg-action px-4 py-2 text-item text-white hover:bg-action-strong"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
