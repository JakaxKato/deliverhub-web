import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type BadgeVariant = "neutral" | "primary" | "deep" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-raised text-muted border",
  primary: "bg-primary/10 text-primary-tint border border-primary/25",
  deep: "bg-deep/20 text-primary-tint border border-deep/40",
  success: "bg-success/10 text-success border border-success/25",
  warning: "bg-warning/10 text-warning border border-warning/25",
  danger: "bg-danger/10 text-danger border border-danger/25",
  info: "bg-info/10 text-primary-tint border border-info/25",
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold leading-4",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
