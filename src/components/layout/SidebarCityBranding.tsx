import { MumbaiLineArt } from "./MumbaiLineArt";

// The sidebar's bottom branding block: line-art Mumbai skyline + Sea Link,
// the city label, and the honest data-mode caveat. Rendered by the shared
// Sidebar (desktop and mobile drawer), so it is identical on every screen.
// One source of truth for illustration, type, spacing, colour and copy.
export function SidebarCityBranding() {
  return (
    <div className="shrink-0 border-t border-line/70 px-2 pt-4">
      {/* Always full size and centred, with even side margins; on short
          screens the nav above scrolls rather than the drawing shrinking. */}
      <MumbaiLineArt className="-mx-3 block w-[calc(100%+1.5rem)] max-w-none h-auto text-civic" />
      <p className="mt-3 text-[16px] leading-5 font-extrabold tracking-[-0.01em] text-ink">Mumbai</p>
      <p className="mt-0.5 text-meta text-ink-2">Urban Intelligence Platform</p>
      <span className="mt-3 block h-px w-8 bg-civic/50" aria-hidden="true" />
      <p className="mt-3 text-meta text-ink-3">
        Prototype · fixture data,
        <br />
        simulated fleet
      </p>
    </div>
  );
}
