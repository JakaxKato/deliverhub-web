"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { useThemeStore } from "../stores/theme-store";

export function ThemeToggle() {
  const { theme, isResolved, toggle, init } = useThemeStore();

  useEffect(() => {
    if (!isResolved) init();
  }, [isResolved, init]);

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="p-2 rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-primary/50 transition-all duration-200"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
