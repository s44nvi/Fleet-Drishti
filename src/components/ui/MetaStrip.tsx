import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface MetaItem {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
}

// Compact horizontal label/value strip for detail pages — replaces the
// stacked uppercase "FIELD ........ value" rows.
export function MetaStrip({ items, className }: { items: MetaItem[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3", className)}>
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex flex-col gap-0.5 min-w-0">
          <dt className="flex items-center gap-1 text-meta text-ink-3">
            {Icon && <Icon size={13} aria-hidden="true" />}
            {label}
          </dt>
          <dd className="text-item text-ink truncate">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
