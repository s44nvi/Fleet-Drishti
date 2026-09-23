import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-space-md">
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="font-label-eyebrow text-label-eyebrow text-ink-muted uppercase tracking-widest">
            {eyebrow}
          </span>
        )}
        <h1 className="font-headline-lg text-headline-lg text-ink-primary font-bold tracking-tight">{title}</h1>
        {description && <p className="font-body-md text-body-md text-ink-muted max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-space-sm">{actions}</div>}
    </div>
  );
}
