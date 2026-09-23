import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// Tier-1 inspection panel: white surface, hairline border, 4-6px radius,
// zero decorative shadow beyond a faint ambient sm shadow — per DESIGN.md
// "Surface Tier 1 (Inspection Panels & Modules)".
export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "bg-surface-card rounded-lg border border-border-slate shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PanelHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  icon?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PanelHeader({ title, icon, meta, actions, className, ...props }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-space-xs pb-space-sm border-b border-border-slate",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-space-sm">
        <span className="flex items-center gap-1.5 font-title-sm text-title-sm text-ink-primary font-bold">
          {icon && <span className="material-symbols-outlined text-[18px] text-primary-civic-active">{icon}</span>}
          {title}
        </span>
        {meta}
      </div>
      {actions}
    </div>
  );
}
