import { create } from "zustand";

type Theme = "dark" | "light";

const STORAGE_KEY = "nodewave_theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

interface ThemeState {
  theme: Theme;
  isResolved: boolean;
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  isResolved: false,

  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    set({ theme: next, isResolved: true });
  },

  init: () => {
    const theme = getInitialTheme();
    applyTheme(theme);
    set({ theme, isResolved: true });
  },
}));
