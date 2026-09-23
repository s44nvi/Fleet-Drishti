import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: ReactNode;
  /** One compact context line (place, data time, source badge) — never a paragraph. */
  context?: ReactNode;
  /** Parent page for detail screens. */
  back?: { to: string; label: string };
  actions?: ReactNode;
}

export function PageHeader({ title, context, back, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1 min-w-0">
        {back && (
          <Link to={back.to} className="inline-flex items-center gap-0.5 text-meta text-ink-3 hover:text-action w-fit">
            <ChevronLeft size={14} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <h1 className="text-display text-ink">{title}</h1>
        {context && <div className="flex flex-wrap items-center gap-2 text-meta text-ink-3">{context}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
