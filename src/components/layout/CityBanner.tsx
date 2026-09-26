import { cn } from "../../lib/cn";

// The Fleet Drishti city banner: the Mumbai skyline + Bandra–Worli Sea Link
// panorama behind every main page header. This file is the ONLY place the
// asset path lives; its crop lives in index.css (.fd-city-banner-img) and
// the header that hosts it is PageHeader.
export const CITY_BANNER_SRC = "/brand/mumbai-city-banner.webp";
const CITY_BANNER_SIZE = { width: 1983, height: 793 };

const navy = (alpha: number) => `rgb(7 20 39 / ${alpha})`;

// Readability veil. Text sits on the left, over the darker blue half of the
// photo; the veil clears towards the right so the Sea Link and sunset stay
// vivid. Narrow screens, where text spans the width, get a more even veil.
const VEIL_WIDE = [
  `linear-gradient(to right, ${navy(0.82)} 0%, ${navy(0.62)} 32%, ${navy(0.22)} 58%, ${navy(0.04)} 80%)`,
  `linear-gradient(to top, ${navy(0.4)} 0%, transparent 45%)`,
].join(", ");
const VEIL_NARROW = [
  `linear-gradient(to right, ${navy(0.8)} 0%, ${navy(0.55)} 55%, ${navy(0.15)} 100%)`,
  `linear-gradient(to top, ${navy(0.45)} 0%, transparent 60%)`,
].join(", ");

/**
 * Fills its (relatively positioned) parent with the panorama and the veil.
 * The parent owns size; the crop is tuned per breakpoint in index.css so the
 * Sea Link stays in frame at every banner width.
 */
export function CityBanner({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[#0a1a33]", className)} aria-hidden="true">
      <img
        src={CITY_BANNER_SRC}
        alt=""
        width={CITY_BANNER_SIZE.width}
        height={CITY_BANNER_SIZE.height}
        decoding="async"
        fetchPriority="high"
        draggable={false}
        className="fd-city-banner-img absolute inset-0 h-full w-full select-none object-cover"
      />
      <div className="absolute inset-0 md:hidden" style={{ background: VEIL_NARROW }} />
      <div className="absolute inset-0 hidden md:block" style={{ background: VEIL_WIDE }} />
    </div>
  );
}
