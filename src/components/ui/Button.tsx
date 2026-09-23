import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-item transition-colors duration-150 disabled:opacity-45 disabled:cursor-not-allowed";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-action text-white hover:bg-action-strong",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2",
  ghost: "text-action hover:bg-action-soft",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "secondary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(BASE, VARIANT_CLASSES[variant], className)} {...props} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function ButtonLink({ variant = "ghost", className, ...props }: ButtonLinkProps) {
  return <Link className={cn(BASE, VARIANT_CLASSES[variant], className)} {...props} />;
}
