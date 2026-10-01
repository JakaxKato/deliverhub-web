"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, UserCheck } from "lucide-react";
import { useAuthStore } from "../stores/auth-store";

export function RoleSwitcherBanner() {
  const { user, quickSwitch, isLoading } = useAuthStore();
  const queryClient = useQueryClient();

  const seededRoles = [
    {
      label: "Product Manager",
      shortLabel: "PM",
      email: "pm@nodewave.id",
      dept: "PRODUCT",
      role: "PM",
      desc: "Full CRUD, set dependencies, client visibility. Cannot move In-Progress to Done.",
      badgeColor: "bg-deep/20 text-primary-tint border-deep/40",
    },
    {
      label: "UI/UX Designer",
      shortLabel: "UI/UX",
      email: "uiux@nodewave.id",
      dept: "UIUX",
      role: "MEMBER",
      desc: "Executes UI design deliverable, uploads Figma specs.",
      badgeColor: "bg-info/10 text-primary-tint border-info/25",
    },
    {
      label: "Frontend Engineer",
      shortLabel: "Frontend",
      email: "fe@nodewave.id",
      dept: "FRONTEND",
      role: "MEMBER",
      desc: "Works on frontend tasks. Blocked if UI/UX or Backend prerequisites are not Done!",
      badgeColor: "bg-info/10 text-primary-tint border-info/25",
    },
    {
      label: "Backend Engineer",
      shortLabel: "Backend",
      email: "be@nodewave.id",
      dept: "BACKEND",
      role: "MEMBER",
      desc: "Completes core API & optimistic locking deliverable.",
      badgeColor: "bg-success/10 text-success border-success/25",
    },
    {
      label: "Client Guest",
      shortLabel: "Client",
      email: "client@acmecorp.com",
      dept: "CLIENT",
      role: "CLIENT",
      desc: "Multi-tenant isolation: Only views aggregate % metrics & client-visible tasks. Identities masked!",
      badgeColor: "bg-warning/10 text-warning border-warning/25",
    },
  ];

  const handleSwitch = async (email: string) => {
    if (user?.email === email) return;
    await quickSwitch(email);
    queryClient.invalidateQueries();
  };

  return (
    <div className="w-full bg-surface/40 border-b border-border px-4 py-2.5 text-xs text-muted">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-faint font-medium">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary-tint text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" strokeWidth={1.5} />
            <span>Assessor Quick-Switcher</span>
          </span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">Instant 1-Click Role Testing:</span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          {seededRoles.map((r) => {
            const isActive = user?.email === r.email;
            return (
              <button
                key={r.email}
                onClick={() => handleSwitch(r.email)}
                disabled={isLoading}
                title={r.desc}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 border ${
                  isActive
                    ? `${r.badgeColor} shadow-glow`
                    : "bg-background/50 hover:bg-surface-raised text-muted hover:text-foreground border-border"
                }`}
              >
                {isActive && <UserCheck className="w-3 h-3 text-primary" strokeWidth={1.5} />}
                <span>{r.shortLabel}</span>
                {isActive && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-foreground/10 uppercase tracking-wider font-mono">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
