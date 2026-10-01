"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore } from "../../stores/toast-store";

const variantStyles = {
  success: "border-success/30 text-success",
  error: "border-danger/30 text-danger",
  info: "border-primary/30 text-primary-tint",
} as const;

const variantIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon = variantIcons[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border-strong glass bg-surface p-4 shadow-glow animate-in"
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${variantStyles[t.variant]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-faint hover:text-foreground transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
