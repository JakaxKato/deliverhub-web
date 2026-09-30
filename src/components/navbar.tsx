"use client";

import { LayoutGrid, LogOut, Sparkles, Table as TableIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";

interface NavbarProps {
  activeView: "board" | "table";
  setActiveView: (view: "board" | "table") => void;
  onOpenStandup: () => void;
  projectName?: string;
  projectKey?: string;
}

export function Navbar({
  activeView,
  setActiveView,
  onOpenStandup,
  projectName = "Enterprise Deliverable Engine",
  projectKey = "NW-CORE",
}: NavbarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === "PM") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          PM · Product Lead
        </span>
      );
    }
    if (user.role === "CLIENT") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Client Guest · Multi-Tenant
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        Engineer · {user.department}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#090d16]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              NW
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                NodeWave
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/50">
                  DeliverableOS
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                {projectName} ({projectKey})
              </span>
            </div>
          </Link>

          {/* View Toggles (Kanban vs Table) - hidden for client guest */}
          {user?.role !== "CLIENT" && (
            <div className="hidden sm:flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 ml-4">
              <button
                onClick={() => setActiveView("board")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === "board"
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Task Board</span>
              </button>
              <button
                onClick={() => setActiveView("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === "table"
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>EzFilter Table</span>
              </button>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Standup summary trigger (only for internal & PM) */}
          {user?.role !== "CLIENT" && (
            <button
              onClick={onOpenStandup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all shadow-sm"
              title="View daily standup auto-summary per department"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Standup Auto-Summary</span>
            </button>
          )}

          {/* User badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            {getRoleBadge()}

            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{user?.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
