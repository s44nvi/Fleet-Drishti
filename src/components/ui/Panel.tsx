import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: "div" | "section" | "aside";
}

// Panel tier: white, 12px radius, hairline border, faint shadow. Workspaces
// (map, video) don't use this — they're bare rounded surfaces.
export function Panel({ className, children, as: Tag = "div", ...props }: PanelProps) {
  return (
    <Tag className={cn("bg-surface rounded-xl border border-line shadow-panel", className)} {...props}>
      {children}
    </Tag>
  );
}

interface PanelHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  icon?: LucideIcon;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Heading level for document outline; panels under the page h1 default to h2. */
  level?: 2 | 3;
}

export function PanelHeader({ title, icon: Icon, meta, actions, level = 2, className, ...props }: PanelHeaderProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)} {...props}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={18} strokeWidth={1.75} className="text-ink-2 shrink-0" aria-hidden="true" />}
        <Heading className="text-title text-ink truncate">{title}</Heading>
        {meta && <span className="text-meta text-ink-3">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
