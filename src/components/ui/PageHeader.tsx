import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { CityBanner } from "../layout/CityBanner";
import { CONTENT_BLEED_TOP, CONTENT_BLEED_X } from "../layout/contentFrame";
import { cn } from "../../lib/cn";

interface PageIntroProps {
  title: ReactNode;
  /** One short sentence saying what the page is for. */
  subtitle?: ReactNode;
  /** Light text, for the city banner. */
  inverse?: boolean;
}

// Title + subtitle — the ONE place page-title typography lives (tokens
// text-page-title / text-page-subtitle in index.css).
function PageIntro({ title, subtitle, inverse }: PageIntroProps) {
  return (
    <div className="min-w-0">
      {/* Plain strings, not cn(): tailwind-merge doesn't know the custom
          text-page-* size tokens and would drop them as "conflicting" with
          the text colour. */}
      <h1 className={`text-page-title-sm sm:text-page-title text-balance ${inverse ? "text-white" : "text-ink"}`}>{title}</h1>
      {subtitle && (
        <p className={`mt-2 max-w-2xl text-page-subtitle-sm sm:text-page-subtitle ${inverse ? "text-white/85" : "text-ink-2"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** One compact context line (place, data time, source badge) — never a paragraph. */
  context?: ReactNode;
  /** Parent page for detail screens. */
  back?: { to: string; label: string };
  /** Page-specific controls, aligned bottom-right (stack below on phones). */
  actions?: ReactNode;
  /**
   * The city-banner header used by every main workspace: a compact,
   * full-width Mumbai skyline + Sea Link strip with the title on it. Every
   * page gets the identical treatment — height, crop, veil, type. Detail
   * screens leave it off and get the same typography on the canvas.
   */
  banner?: boolean;
}

export function PageHeader({ title, subtitle, context, back, actions, banner }: PageHeaderProps) {
  const body = (
    <>
      <div className="flex flex-col gap-3 min-w-0">
        {back && (
          <Link
            to={back.to}
            className={cn(
              "inline-flex items-center gap-0.5 text-meta w-fit",
              banner ? "text-white/75 hover:text-white" : "text-ink-3 hover:text-action",
            )}
          >
            <ChevronLeft size={14} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <PageIntro title={title} subtitle={subtitle} inverse={banner} />
        {context && (
          <div className={cn("flex flex-wrap items-center gap-2 text-meta", banner ? "text-white/80" : "text-ink-3")}>{context}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:self-end">{actions}</div>}
    </>
  );

  if (!banner) {
    return <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-1">{body}</header>;
  }

  return (
    <header
      className={cn(
        // Bleeds to the content column's top and side edges; one height for
        // every page (content may only grow it on phones, where copy wraps).
        "relative isolate overflow-hidden min-h-[168px] lg:min-h-[176px] min-[1832px]:rounded-b-2xl",
        CONTENT_BLEED_X,
        CONTENT_BLEED_TOP,
      )}
    >
      <CityBanner className="-z-10" />
      <div className="flex min-h-[inherit] flex-col sm:flex-row sm:flex-wrap sm:items-start justify-between gap-x-6 gap-y-4 px-4 pt-5 pb-5 sm:px-6 lg:pt-6">
        {body}
      </div>
    </header>
  );
}
