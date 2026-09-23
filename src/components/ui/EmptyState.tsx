import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** One short line of direction — what will fill this, or what to do. */
  hint?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, hint, className, compact }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center gap-1.5", compact ? "py-4 px-3" : "py-10 px-6", className)}>
      {Icon && (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-ink-3 mb-1" aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}
      <p className="text-item text-ink-2">{title}</p>
      {hint && <p className="text-meta text-ink-3 max-w-[40ch]">{hint}</p>}
    </div>
  );
}
