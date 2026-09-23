import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { IconTile } from "../ui";
import { cn } from "../../lib/cn";
import { categoryVisual, type Tone } from "../../lib/visuals";

interface ObservationRowProps {
  /** Fixture subtype/objectClass/assetType — picks the glyph + tone. */
  category: string;
  /** Override the category's default tone (e.g. by severity). */
  tone?: Tone;
  title: ReactNode;
  /** Domain-specific metadata line(s) — each page decides what matters. */
  meta?: ReactNode;
  /** Right-hand column: time, severity, status. */
  aside?: ReactNode;
  /** Optional evidence thumbnail slot, left of the text. */
  thumbnail?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onHover?: (hovering: boolean) => void;
  /** Detail page link (rendered as a trailing chevron when onSelect is also set). */
  href?: string;
  id?: string;
}

// Shared row language for anything observed on the street. The shell
// (icon tile, title, meta, aside, selection) is common; the content of
// `meta`/`aside` stays domain-specific — a road issue shows corroborating
// buses, a traffic reading shows speed, a safety event shows the observing
// bus — so no domain is forced into another's data structure.
export function ObservationRow({
  category,
  tone,
  title,
  meta,
  aside,
  thumbnail,
  selected,
  onSelect,
  onHover,
  href,
  id,
}: ObservationRowProps) {
  const visual = categoryVisual(category);
  const body = (
    <>
      {thumbnail ?? <IconTile icon={visual.icon} tone={tone ?? visual.tone} size="md" />}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="text-item text-ink min-w-0 [overflow-wrap:anywhere]">{title}</div>
        {meta && <div className="text-meta text-ink-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">{meta}</div>}
      </div>
      {aside && <div className="flex flex-col items-end gap-1 shrink-0 text-meta text-ink-3">{aside}</div>}
    </>
  );

  const rowClass = cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-left w-full",
    selected ? "bg-action-soft ring-1 ring-action/30" : "hover:bg-surface-2",
  );

  if (onSelect) {
    return (
      <div id={id} className={cn(rowClass, "group")} onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}>
        <button type="button" onClick={onSelect} aria-pressed={selected} className="flex flex-1 items-center gap-3 min-w-0 text-left">
          {body}
        </button>
        {href && (
          <Link
            to={href}
            aria-label="Open details"
            className="h-8 w-8 -mr-1 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-action hover:bg-surface shrink-0"
          >
            <ChevronRight size={16} />
          </Link>
        )}
      </div>
    );
  }

  if (href) {
    return (
      <Link id={id} to={href} className={rowClass} onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}>
        {body}
      </Link>
    );
  }

  return (
    <div id={id} className={rowClass}>
      {body}
    </div>
  );
}
