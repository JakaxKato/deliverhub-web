"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldAlert, X } from "lucide-react";
import { useConflictStore } from "../stores/conflict-store";

export function ConflictDialog() {
  const { isOpen, message, latestData, closeConflict } = useConflictStore();
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleRefreshAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["task"] });
    closeConflict();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0f172a] p-6 shadow-2xl glow-rose relative">
        <button
          onClick={closeConflict}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              409 Conflict: Optimistic Lock Rejection
            </h3>
            <p className="text-sm text-slate-400 mt-1">Race Condition Prevention Triggered</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <p>
            {message ||
              "Another user modified this deliverable at the exact same moment. Your changes were safely paused to prevent overwriting their work."}
          </p>

          {latestData && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1">
              <div className="text-slate-400 font-semibold uppercase tracking-wider">
                Current Server State:
              </div>
              <div className="text-slate-300">
                <span className="text-slate-400">Status: </span>
                <span className="font-mono text-cyan-400">{latestData.status}</span>
              </div>
              <div className="text-slate-300">
                <span className="text-slate-400">Latest Version: </span>
                <span className="font-mono text-amber-400">v{latestData.version}</span>
              </div>
              <div className="text-slate-300 truncate">
                <span className="text-slate-400">Last Modified: </span>
                <span>{new Date(latestData.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeConflict}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRefreshAndClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Latest Version
          </button>
        </div>
      </div>
    </div>
  );
}
