import type { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { TONE_CLASSES, type Tone } from "../../lib/visuals";

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: LucideIcon;
}

// Status pill: soft tint + ink text, sentence case. Colour is never the only
// signal — the word always carries the meaning.
export function StatusBadge({ tone = "neutral", icon: Icon, className, children, ...props }: StatusBadgeProps) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro whitespace-nowrap",
        t.soft,
        t.ink,
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
      {children}
    </span>
  );
}
