"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { useEffect } from "react";
import { queryClient } from "../lib/query-client";
import { useAuthStore } from "../stores/auth-store";
import { useThemeStore } from "../stores/theme-store";
import { ConflictDialog } from "./conflict-dialog";
import { Toaster } from "./ui/toast";
import { TooltipProvider } from "./ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initAuth);
  const initTheme = useThemeStore((s) => s.init);
  const themeResolved = useThemeStore((s) => s.isResolved);

  // Rehydrate the auth session and theme from localStorage on the client.
  useEffect(() => {
    initAuth();
    if (!themeResolved) initTheme();
  }, [initAuth, initTheme, themeResolved]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <ConflictDialog />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
