import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-civic-deep text-white hover:bg-primary-civic-active focus-visible:ring-primary-civic-active",
  secondary:
    "bg-transit-ochre text-ink-primary hover:bg-transit-warning focus-visible:ring-transit-ochre",
  outline:
    "bg-surface-card border border-border-grid text-ink-primary hover:bg-surface-panel focus-visible:ring-border-grid",
  ghost:
    "bg-transparent text-ink-secondary hover:bg-surface-panel focus-visible:ring-border-grid",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded font-body-sm text-body-sm font-semibold px-space-md py-space-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
