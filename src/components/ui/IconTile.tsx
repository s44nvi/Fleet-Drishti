import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { TONE_CLASSES, type Tone } from "../../lib/visuals";

interface IconTileProps {
  icon: LucideIcon;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  /** Filled tile (white glyph on solid tone) instead of soft tint. */
  solid?: boolean;
  className?: string;
  label?: string;
}

const SIZE: Record<NonNullable<IconTileProps["size"]>, { box: string; icon: number }> = {
  sm: { box: "h-7 w-7 rounded-md", icon: 15 },
  md: { box: "h-9 w-9 rounded-lg", icon: 18 },
  lg: { box: "h-11 w-11 rounded-xl", icon: 22 },
};

// The category glyph in a tinted rounded square — the reference's KPI and
// feed-row icon treatment.
export function IconTile({ icon: Icon, tone = "neutral", size = "md", solid, className, label }: IconTileProps) {
  const t = TONE_CLASSES[tone];
  const s = SIZE[size];
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", s.box, solid ? cn(t.solid, "text-white") : cn(t.soft, t.ink), className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon size={s.icon} strokeWidth={1.75} />
    </span>
  );
}
