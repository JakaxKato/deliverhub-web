"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  FileText,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth-store";
import type { StandupSummary } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface StandupModalProps {
  projectId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StandupSummaryModal({ projectId, userId, isOpen, onClose }: StandupModalProps) {
  const user = useAuthStore((state) => state.user);
  const canView = user?.id === userId && (user.role === "PM" || user.role === "MEMBER");
  const [copied, setCopied] = useState(false);
  // Target date defaults to "yesterday" server-side; query a custom date by
  // appending ?date=YYYY-MM-DD when needed.
  const selectedDate = "";

  const { data, isLoading, error } = useQuery<StandupSummary>({
    queryKey: ["standup-summary", "internal", userId, projectId, selectedDate],
    queryFn: async () => {
      const url = selectedDate
        ? `/audit/standup-summary/${projectId}?date=${selectedDate}`
        : `/audit/standup-summary/${projectId}`;
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: canView && isOpen && !!projectId,
  });

  if (!isOpen || !canView) return null;

  const handleCopyMarkdown = () => {
    if (data?.markdown) {
      navigator.clipboard.writeText(data.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const departments = ["PRODUCT", "UIUX", "FRONTEND", "BACKEND"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-md p-4 animate-in">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-border glass bg-surface shadow-glow overflow-hidden animate-in-scale">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/25 text-primary">
              <ClipboardList className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Daily Standup Auto-Summary</h2>
              <p className="text-xs text-faint mt-0.5">
                Aggregated from immutable audit trails & live dependency state per department
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-faint hover:text-foreground hover:bg-surface-raised transition-colors"
            aria-label="Close standup summary"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm">Synthesizing standup summary from audit logs...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/25 text-danger text-sm">
              Failed to load standup summary. Please make sure you have access to this project.
            </div>
          )}

          {data && !error && (
            <>
              {/* Top controls: Date info & Copy button */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-raised/50 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Calendar className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span>
                    Target Date: <strong className="text-foreground font-mono">{data.date}</strong>
                  </span>
                </div>

                <Button variant="primary" size="sm" onClick={handleCopyMarkdown}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-success" strokeWidth={1.5} />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                      Copy for Slack / Discord
                    </>
                  )}
                </Button>
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
                      className="rounded-xl border border-border bg-surface-raised/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" className="font-mono uppercase tracking-wider">
                            {dept}
                          </Badge>
                          <span className="text-xs text-faint">Team Deliverables</span>
                        </div>
                        {!hasActivity && (
                          <span className="text-xs text-faint italic">
                            No active movements yesterday
                          </span>
                        )}
                      </div>

                      {/* Completed yesterday */}
                      {completed.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-success flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            <span>Completed Yesterday:</span>
                          </div>
                          <div className="space-y-1 pl-5">
                            {completed.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted flex items-center justify-between"
                              >
                                <span>
                                  <strong className="text-primary-tint font-mono">
                                    [{item.taskCode}]
                                  </strong>{" "}
                                  {item.title}
                                </span>
                                <span className="text-[11px] text-faint">
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
                          <div className="text-xs font-semibold text-primary-tint flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                            <span>Currently In Progress:</span>
                          </div>
                          <div className="space-y-1 pl-5">
                            {inProgress.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted flex items-center justify-between"
                              >
                                <span>
                                  <strong className="text-primary-tint font-mono">
                                    [{item.taskCode}]
                                  </strong>{" "}
                                  {item.title}
                                </span>
                                <span className="text-[11px] text-faint">{item.assigneeName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Blocked */}
                      {blocked.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-danger flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.5} />
                            <span>Blocked Today:</span>
                          </div>
                          <div className="space-y-1 pl-5">
                            {blocked.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-danger/90 flex flex-col gap-0.5 bg-danger/5 p-2 rounded border border-danger/15"
                              >
                                <div>
                                  <strong className="text-danger font-mono">
                                    [{item.taskCode}]
                                  </strong>{" "}
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-danger/80 italic">
                                  {item.blockedReason}
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
              <div className="rounded-xl border border-border bg-background/60 p-4 space-y-2">
                <div className="text-xs font-mono uppercase text-faint flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Generated Markdown Format:</span>
                </div>
                <pre className="text-xs font-mono text-muted whitespace-pre-wrap overflow-x-auto p-3 bg-background rounded-lg border border-border">
                  {data.markdown}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-surface-raised/40">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
