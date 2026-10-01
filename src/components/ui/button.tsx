import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "deep" | "outline" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Pill-shaped brand CTA: gradient cyan -> deep blue
  primary:
    "rounded-full bg-gradient-to-r from-primary to-deep text-white shadow-glow hover:from-primary-hover hover:to-deep hover:brightness-110",
  // Deep blue, active states
  deep: "rounded-lg bg-deep text-white hover:brightness-110",
  outline:
    "rounded-lg border border-border-strong bg-transparent text-foreground hover:border-primary/60 hover:text-primary-tint",
  ghost: "rounded-lg bg-transparent text-muted hover:bg-surface-raised hover:text-foreground",
  subtle: "rounded-lg bg-primary/10 text-primary-tint border border-primary/20 hover:bg-primary/20",
  danger: "rounded-lg bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
