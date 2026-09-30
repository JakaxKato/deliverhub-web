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
      badgeColor: "border-purple-500/40 text-purple-400 bg-purple-500/10",
    },
    {
      label: "UI/UX Designer",
      shortLabel: "UI/UX",
      email: "uiux@nodewave.id",
      dept: "UIUX",
      role: "MEMBER",
      desc: "Executes UI design deliverable, uploads Figma specs.",
      badgeColor: "border-pink-500/40 text-pink-400 bg-pink-500/10",
    },
    {
      label: "Frontend Engineer",
      shortLabel: "Frontend",
      email: "fe@nodewave.id",
      dept: "FRONTEND",
      role: "MEMBER",
      desc: "Works on frontend tasks. Blocked if UI/UX or Backend prerequisites are not Done!",
      badgeColor: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
    },
    {
      label: "Backend Engineer",
      shortLabel: "Backend",
      email: "be@nodewave.id",
      dept: "BACKEND",
      role: "MEMBER",
      desc: "Completes core API & optimistic locking deliverable.",
      badgeColor: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "Client Guest",
      shortLabel: "Client",
      email: "client@acmecorp.com",
      dept: "CLIENT",
      role: "CLIENT",
      desc: "Multi-tenant isolation: Only views aggregate % metrics & client-visible tasks. Identities masked!",
      badgeColor: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    },
  ];

  const handleSwitch = async (email: string) => {
    if (user?.email === email) return;
    await quickSwitch(email);
    queryClient.invalidateQueries();
  };

  return (
    <div className="w-full bg-[#0a0f1d] border-b border-slate-800/80 px-4 py-2.5 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Assessor Quick-Switcher</span>
          </div>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-400">Instant 1-Click Role Testing:</span>
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? `${r.badgeColor} ring-1 ring-white/20 shadow-md`
                    : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {isActive && <UserCheck className="w-3 h-3 text-cyan-400" />}
                <span>{r.shortLabel}</span>
                {isActive && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-white/10 uppercase tracking-wider font-mono">
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
