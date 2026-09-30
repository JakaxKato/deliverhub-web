"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Loader2,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import type { StandupSummary } from "../types";

interface StandupModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StandupSummaryModal({ projectId, isOpen, onClose }: StandupModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedDate, _setSelectedDate] = useState<string>("");

  const { data, isLoading, error } = useQuery<StandupSummary>({
    queryKey: ["standup-summary", projectId, selectedDate],
    queryFn: async () => {
      const url = selectedDate
        ? `/audit/standup-summary/${projectId}?date=${selectedDate}`
        : `/audit/standup-summary/${projectId}`;
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: isOpen && !!projectId,
  });

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (data?.markdown) {
      navigator.clipboard.writeText(data.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const departments = ["PRODUCT", "UIUX", "FRONTEND", "BACKEND"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700/60 bg-[#0f172a] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Daily Standup Auto-Summary
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Bonus Feature
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregated from immutable audit trails & live dependency state per department
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
              <p className="text-sm">Synthesizing standup summary from audit logs...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              Failed to load standup summary. Please make sure you have access to this project.
            </div>
          )}

          {data && (
            <>
              {/* Top controls: Date info & Copy button */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>
                    Target Date: <strong className="text-white font-mono">{data.date}</strong>
                  </span>
                </div>

                <button
                  onClick={handleCopyMarkdown}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? "Copied to Clipboard!" : "Copy for Slack / Discord"}
                </button>
              </div>

              {/* Department breakdown sections */}
              <div className="space-y-4">
                {departments.map((dept) => {
                  const completed = data.summary.completedYesterday[dept] || [];
                  const blocked = data.summary.blockedToday[dept] || [];
                  const inProgress = data.summary.inProgressToday[dept] || [];

                  const hasActivity =
                    completed.length > 0 || blocked.length > 0 || inProgress.length > 0;

                  return (
                    <div
                      key={dept}
                      className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            {dept}
                          </span>
                          <span className="text-xs text-slate-400">Team Deliverables</span>
                        </div>
                        {!hasActivity && (
                          <span className="text-xs text-slate-500 italic">
                            No active movements yesterday
                          </span>
                        )}
                      </div>

                      {/* Completed yesterday */}
                      {completed.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Completed Yesterday:</span>
                          </div>
                          <div className="space-y-1 pl-5">
                            {completed.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-slate-300 flex items-center justify-between"
                              >
                                <span>
                                  <strong className="text-cyan-400 font-mono">
                                    [{item.taskCode}]
                                  </strong>{" "}
                                  {item.title}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  by {item.completedBy}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* In Progress */}
                      {inProgress.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Currently In Progress:</span>
                          </div>
                          <div className="space-y-1 pl-5">
                            {inProgress.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-slate-300 flex items-center justify-between"
                              >
                                <span>
                                  <strong className="text-cyan-400 font-mono">
                                    [{item.taskCode}]
                                  </strong>{" "}
                                  {item.title}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {item.assigneeName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Blocked */}
                      {blocked.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Blocked Today:</span>
                          </div>
                          <div className="space-y-1 pl-5">
                            {blocked.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-rose-300/90 flex flex-col gap-0.5 bg-rose-500/5 p-2 rounded border border-rose-500/10"
                              >
                                <div>
                                  <strong className="text-rose-400 font-mono">
                                    [{item.taskCode}]
                                  </strong>{" "}
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-rose-400/80 italic">
                                  ⚠️ {item.blockedReason}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Raw Markdown Preview Box */}
              <div className="rounded-xl border border-slate-800 bg-black/40 p-4 space-y-2">
                <div className="text-xs font-mono uppercase text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generated Markdown Format:</span>
                </div>
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto p-3 bg-slate-950/70 rounded-lg border border-slate-900">
                  {data.markdown}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
