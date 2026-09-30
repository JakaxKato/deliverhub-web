"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  GitPullRequest,
  History,
  Lock,
  Paperclip,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { useConflictStore } from "../stores/conflict-store";
import type { Role, Task } from "../types";

interface TaskDrawerProps {
  task: Task | null;
  allTasks: Task[];
  userRole?: Role;
  onClose: () => void;
}

export function TaskDetailDrawer({
  task: initialTask,
  allTasks,
  userRole,
  onClose,
}: TaskDrawerProps) {
  const queryClient = useQueryClient();
  const { openConflict } = useConflictStore();
  const [activeTab, setActiveTab] = useState<"overview" | "dependencies" | "attachments" | "audit">(
    "overview",
  );

  // Form states for PM editing description
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(initialTask?.description || "");
  const [_isClientVisibleValue, _setIsClientVisibleValue] = useState(
    initialTask?.isClientVisible ?? false,
  );

  // Attachment form state
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, _setAttachmentType] = useState("link/figma");

  // Dependency form state
  const [selectedPrereqId, setSelectedPrereqId] = useState("");
  const [dependencyError, setDependencyError] = useState<string | null>(null);

  // Fetch full details of this task including auditLogs
  const { data: task } = useQuery<Task>({
    queryKey: ["task", initialTask?.id],
    queryFn: async () => {
      const res = await api.get(`/tasks/${initialTask?.id}`);
      return res.data.data;
    },
    initialData: initialTask || undefined,
    enabled: !!initialTask?.id,
  });

  // Mutation: Update Task Details (PM ONLY, with version optimistic locking)
  const updateDetailsMutation = useMutation({
    mutationFn: async (payload: { description?: string; isClientVisible?: boolean }) => {
      const res = await api.put(`/tasks/${task?.id}`, {
        version: task?.version,
        description: payload.description,
        isClientVisible: payload.isClientVisible,
      });
      return res.data;
    },
    onSuccess: () => {
      setIsEditingDescription(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task?.id] });
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        openConflict({
          message: err.response.data.message,
          latestData: err.response.data.latestData,
        });
      } else {
        alert(err.response?.data?.message || "Failed to update deliverable details.");
      }
    },
  });

  // Mutation: Add Dependency (PM ONLY)
  const addDependencyMutation = useMutation({
    mutationFn: async (prerequisiteTaskId: string) => {
      setDependencyError(null);
      const res = await api.post(`/tasks/${task?.id}/dependencies`, {
        prerequisiteTaskId,
      });
      return res.data;
    },
    onSuccess: () => {
      setSelectedPrereqId("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task?.id] });
    },
    onError: (err: any) => {
      setDependencyError(err.response?.data?.message || "Failed to add dependency.");
    },
  });

  // Mutation: Remove Dependency (PM ONLY)
  const removeDependencyMutation = useMutation({
    mutationFn: async (prereqId: string) => {
      const res = await api.delete(`/tasks/${task?.id}/dependencies/${prereqId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task?.id] });
    },
  });

  // Mutation: Add Attachment
  const addAttachmentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/tasks/${task?.id}/attachments`, {
        fileName: attachmentName,
        fileUrl: attachmentUrl,
        fileType: attachmentType,
      });
      return res.data;
    },
    onSuccess: () => {
      setAttachmentName("");
      setAttachmentUrl("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task?.id] });
    },
  });

  if (!task) return null;

  // Potential prerequisites to add (exclude self and already added)
  const existingDepIds = new Set(
    (task.dependencies || []).map((d: any) => d.prerequisiteTask?.id || d.id),
  );
  const availablePrereqs = allTasks.filter((t) => t.id !== task.id && !existingDepIds.has(t.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0d1322] border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 bg-[#0f172a]/90 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                {task.taskCode}
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Lock Version: v{task.version}
              </span>
              {task.isClientVisible && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Client Visible
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white line-clamp-1">{task.title}</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-5 gap-4">
          {[
            { id: "overview", label: "Overview" },
            {
              id: "dependencies",
              label: `Prerequisites (${(task.dependencies || []).length})`,
            },
            {
              id: "attachments",
              label: `Deliverables (${(task.attachments || []).length})`,
            },
            {
              id: "audit",
              label: "Audit Trail",
              hidden: userRole === "CLIENT",
            },
          ]
            .filter((t) => !t.hidden)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "border-cyan-400 text-cyan-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Blocked State Notice */}
              {task.isBlocked && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-rose-400 uppercase tracking-wide">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Deliverable is Currently Blocked</span>
                  </div>
                  <p>{task.blockedReason}</p>
                </div>
              )}

              {/* Status & Department Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Current Status
                  </span>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        task.status === "DONE"
                          ? "bg-emerald-400"
                          : task.status === "IN_PROGRESS"
                            ? "bg-cyan-400"
                            : task.status === "BLOCKED"
                              ? "bg-rose-400"
                              : "bg-slate-400"
                      }`}
                    />
                    {task.status}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Department
                  </span>
                  <span className="text-sm font-bold text-white">
                    {task.department || "General"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Priority
                  </span>
                  <span className="text-sm font-bold text-white">{task.priority}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Assigned Executor
                  </span>
                  <span className="text-sm font-bold text-white">
                    {task.assignee ? (task.assignee as any).name : "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Core Description Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Task Description & Specification
                  </span>
                  {userRole === "PM" && (
                    <button
                      onClick={() => {
                        if (isEditingDescription) {
                          updateDetailsMutation.mutate({ description: descriptionValue });
                        } else {
                          setIsEditingDescription(true);
                        }
                      }}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {isEditingDescription ? (
                        <>
                          <Save className="w-3.5 h-3.5" /> Save Changes
                        </>
                      ) : (
                        "Edit Description"
                      )}
                    </button>
                  )}
                </div>

                {isEditingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl bg-slate-950 border border-cyan-500/40 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <div className="text-[11px] text-amber-400/90 italic">
                      * Concurrency protection active: Saving will verify version v{task.version}.
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {task.description || "No description provided."}
                  </div>
                )}
              </div>

              {/* Client Visibility Toggle (PM Only) */}
              {userRole === "PM" && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">
                      Client-Guest Visibility
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      When enabled, this deliverable is published to the client portal with masked
                      identities.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !task.isClientVisible;
                      updateDetailsMutation.mutate({ isClientVisible: next });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      task.isClientVisible
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {task.isClientVisible ? "Published to Client" : "Internal Only"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PREREQUISITES / DEPENDENCIES */}
          {activeTab === "dependencies" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Prerequisites Required for Completion
                </h4>
                <p className="text-xs text-slate-400">
                  This task cannot be moved to In Progress until all prerequisites below are marked
                  DONE.
                </p>
              </div>

              {/* Existing Prerequisites List */}
              <div className="space-y-2">
                {(!task.dependencies || task.dependencies.length === 0) && (
                  <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-xs text-slate-500">
                    No prerequisites defined for this deliverable.
                  </div>
                )}

                {(task.dependencies || []).map((dep: any) => {
                  const prereq = dep.prerequisiteTask || dep;
                  const isPrereqDone = prereq.status === "DONE";

                  return (
                    <div
                      key={prereq.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isPrereqDone
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                          : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isPrereqDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold">{prereq.taskCode}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isPrereqDone
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {prereq.status}
                            </span>
                          </div>
                          <span className="text-xs text-slate-300 block mt-0.5">
                            {prereq.title}
                          </span>
                        </div>
                      </div>

                      {userRole === "PM" && (
                        <button
                          onClick={() => removeDependencyMutation.mutate(prereq.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove prerequisite"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Prerequisite Form (PM Only) */}
              {userRole === "PM" && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-white block">
                    Define New Dependency (PM Only)
                  </span>

                  {dependencyError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                      {dependencyError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <select
                      value={selectedPrereqId}
                      onChange={(e) => setSelectedPrereqId(e.target.value)}
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    >
                      <option value="">Select a prerequisite deliverable...</option>
                      {availablePrereqs.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.taskCode}] {p.title} ({p.department} - {p.status})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        if (selectedPrereqId) {
                          addDependencyMutation.mutate(selectedPrereqId);
                        }
                      }}
                      disabled={!selectedPrereqId || addDependencyMutation.isPending}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Cycle detection is enforced automatically. Attempting to create an infinite
                    circular loop (A → B → A) will be prevented.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORK DELIVERABLES / ATTACHMENTS */}
          {activeTab === "attachments" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Work Deliverables & Proof of Completion
                </h4>
                <p className="text-xs text-slate-400">
                  Internal engineers and PM upload Figma handoffs, Pull Requests, and asset URLs.
                </p>
              </div>

              {/* Attachments List */}
              <div className="space-y-2">
                {(!task.attachments || task.attachments.length === 0) && (
                  <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-xs text-slate-500">
                    No deliverables attached yet.
                  </div>
                )}

                {(task.attachments || []).map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {att.fileType?.includes("pr") ? (
                          <GitPullRequest className="w-4 h-4" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          {att.fileName}
                        </span>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <span>{att.fileUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Attachment Form (Internal Team & PM) */}
              {userRole !== "CLIENT" && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-white block">
                    Upload / Attach Deliverable
                  </span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Deliverable Name (e.g. Figma UI v2 or PR #42)"
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <input
                      type="url"
                      placeholder="Deliverable URL (https://...)"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <button
                      onClick={() => {
                        if (attachmentName && attachmentUrl) {
                          addAttachmentMutation.mutate();
                        }
                      }}
                      disabled={
                        !attachmentName || !attachmentUrl || addAttachmentMutation.isPending
                      }
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all shadow-md"
                    >
                      Attach Deliverable
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: IMMUTABLE AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>Immutable Audit Trail</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Every field change, status transition, and assignment is permanently logged.
                </p>
              </div>

              <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-[2px] before:bg-slate-800">
                {(!task.auditLogs || task.auditLogs.length === 0) && (
                  <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-xs text-slate-500">
                    No audit records found.
                  </div>
                )}

                {(task.auditLogs || []).map((log) => (
                  <div key={log.id} className="relative flex items-start gap-4 pl-8 text-xs">
                    {/* Timeline bullet */}
                    <div className="absolute left-[13px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-slate-900" />

                    <div className="flex-1 rounded-xl bg-slate-900/60 border border-slate-800 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <span>{log.user.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {log.user.role}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-slate-300">
                        <span className="font-mono text-cyan-400">{log.action}</span>
                        {log.changedColumn && (
                          <span className="text-slate-400">
                            {" "}
                            on column <code className="text-slate-200">[{log.changedColumn}]</code>
                          </span>
                        )}
                      </div>

                      {(log.oldValue || log.newValue) && (
                        <div className="text-[11px] font-mono p-1.5 rounded bg-black/40 border border-slate-950 text-slate-400">
                          {log.oldValue && <span className="text-rose-400">- {log.oldValue} </span>}
                          {log.newValue && (
                            <span className="text-emerald-400">+ {log.newValue}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
