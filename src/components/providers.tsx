"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { useEffect } from "react";
import { queryClient } from "../lib/query-client";
import { useAuthStore } from "../stores/auth-store";
import { ConflictDialog } from "./conflict-dialog";

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initAuth);

  // Rehydrate the auth session from localStorage on the client. The auth
  // loading state itself is rendered by the pages, so no extra gate is
  // needed here.
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ConflictDialog />
    </QueryClientProvider>
  );
}
