import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const baseField =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground " +
  "placeholder:text-faint transition-colors duration-200 ease-out " +
  "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseField, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseField, "resize-none", className)} {...props} />;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-foreground/80 mb-1.5">{children}</label>
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-danger mt-1.5 flex items-center gap-1.5">{children}</p>;
}
