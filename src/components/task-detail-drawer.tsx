"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  GitPullRequest,
  History,
  Loader2,
  Lock,
  Paperclip,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { api, getApiErrorMessage } from "../lib/api";
import { useConflictStore } from "../stores/conflict-store";
import { toast } from "../stores/toast-store";
import type { Role, Task, TaskPrerequisite } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { EmptyState } from "./ui-states";

interface TaskDrawerProps {
  task: Task | null;
  allTasks: Task[];
  userRole?: Role;
  onClose: () => void;
}

type DrawerTab = "overview" | "dependencies" | "attachments" | "audit";

export function TaskDetailDrawer({
  task: initialTask,
  allTasks,
  userRole,
  onClose,
}: TaskDrawerProps) {
  const queryClient = useQueryClient();
  const { openConflict } = useConflictStore();
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");

  // Form states for PM editing description
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(initialTask?.description || "");

  // Attachment form state
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType] = useState("link/figma");

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
      toast({ variant: "success", title: "Deliverable updated" });
    },
    onError: (err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        openConflict({
          message: getApiErrorMessage(err, "Concurrency conflict."),
          latestData: (err as { response?: { data?: { latestData?: Task } } })?.response?.data
            ?.latestData,
        });
      } else {
        toast({
          variant: "error",
          title: "Failed to update deliverable",
          description: getApiErrorMessage(err),
        });
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
      toast({ variant: "success", title: "Dependency added" });
    },
    onError: (err) => {
      setDependencyError(getApiErrorMessage(err, "Failed to add dependency."));
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
      toast({ variant: "success", title: "Dependency removed" });
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
      toast({ variant: "success", title: "Deliverable attached" });
    },
    onError: (err) => {
      toast({
        variant: "error",
        title: "Failed to attach deliverable",
        description: getApiErrorMessage(err),
      });
    },
  });

  if (!task) return null;

  // Potential prerequisites to add (exclude self and already added)
  const existingDepIds = new Set(
    (task.dependencies || []).map((d) => d.prerequisiteTask?.id || ""),
  );
  const availablePrereqs = allTasks.filter((t) => t.id !== task.id && !existingDepIds.has(t.id));

  const tabs: { id: DrawerTab; label: string; hidden?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "dependencies", label: `Prerequisites (${(task.dependencies || []).length})` },
    { id: "attachments", label: `Deliverables (${(task.attachments || []).length})` },
    { id: "audit", label: "Audit Trail", hidden: userRole === "CLIENT" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm animate-in">
      <div className="w-full max-w-2xl bg-surface border-l border-border h-full flex flex-col shadow-glow overflow-hidden animate-in">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border bg-surface/90 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-primary-tint bg-deep/20 px-2 py-0.5 rounded border border-deep/40">
                {task.taskCode}
              </span>
              <span className="text-xs font-mono text-faint bg-surface-raised px-2 py-0.5 rounded border border-border">
                Lock Version: v{task.version}
              </span>
              {task.isClientVisible && (
                <Badge variant="deep">
                  <Eye className="w-3 h-3" strokeWidth={1.5} />
                  Client Visible
                </Badge>
              )}
            </div>
            <h3 className="text-base font-bold text-foreground line-clamp-1">{task.title}</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-faint hover:text-foreground hover:bg-surface-raised transition-colors"
            aria-label="Close task details"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-surface-raised/40 px-5 gap-1">
          {tabs
            .filter((t) => !t.hidden)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? "border-primary text-primary-tint"
                    : "border-transparent text-faint hover:text-foreground"
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
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                    <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
                    <span>Deliverable is Currently Blocked</span>
                  </div>
                  <p className="text-danger/90">{task.blockedReason}</p>
                </div>
              )}

              {/* Status & Department Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-surface-raised/60 border border-border">
                  <span className="text-[11px] uppercase tracking-wider text-faint block mb-1">
                    Current Status
                  </span>
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        task.status === "DONE"
                          ? "bg-success"
                          : task.status === "IN_PROGRESS"
                            ? "bg-primary"
                            : task.status === "BLOCKED"
                              ? "bg-danger"
                              : "bg-faint"
                      }`}
                    />
                    {task.status}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised/60 border border-border">
                  <span className="text-[11px] uppercase tracking-wider text-faint block mb-1">
                    Department
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {task.department || "General"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised/60 border border-border">
                  <span className="text-[11px] uppercase tracking-wider text-faint block mb-1">
                    Priority
                  </span>
                  <span className="text-sm font-bold text-foreground">{task.priority}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised/60 border border-border">
                  <span className="text-[11px] uppercase tracking-wider text-faint block mb-1">
                    Assigned Executor
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {task.assignee ? task.assignee.name : "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Core Description Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
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
                      className="text-xs font-semibold text-primary-tint hover:text-primary flex items-center gap-1 transition-colors"
                    >
                      {isEditingDescription ? (
                        <>
                          {updateDetailsMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                          )}
                          Save Changes
                        </>
                      ) : (
                        "Edit Description"
                      )}
                    </button>
                  )}
                </div>

                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      rows={5}
                    />
                    <div className="text-[11px] text-warning/90 italic">
                      Concurrency protection active: Saving will verify version v{task.version}.
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-raised/50 border border-border text-xs text-muted leading-relaxed whitespace-pre-wrap">
                    {task.description || "No description provided."}
                  </div>
                )}
              </div>

              {/* Client Visibility Toggle (PM Only) */}
              {userRole === "PM" && (
                <div className="p-4 rounded-xl bg-surface-raised/50 border border-border flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      Client-Guest Visibility
                    </span>
                    <span className="text-[11px] text-faint block">
                      When enabled, this deliverable is published to the client portal with masked
                      identities.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !task.isClientVisible;
                      updateDetailsMutation.mutate({ isClientVisible: next });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      task.isClientVisible
                        ? "bg-deep/20 text-primary-tint border border-deep/40"
                        : "bg-surface-raised text-faint border border-border"
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
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Prerequisites Required for Completion
                </h4>
                <p className="text-xs text-faint">
                  This task cannot be moved to In Progress until all prerequisites below are marked
                  DONE.
                </p>
              </div>

              {/* Existing Prerequisites List */}
              <div className="space-y-2">
                {(!task.dependencies || task.dependencies.length === 0) && (
                  <EmptyState
                    title="No prerequisites defined"
                    message="This deliverable has no upstream dependencies."
                  />
                )}

                {(task.dependencies || []).map((dep) => {
                  const prereq: TaskPrerequisite = dep.prerequisiteTask;
                  const isPrereqDone = prereq.status === "DONE";

                  return (
                    <div
                      key={prereq.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors duration-200 ${
                        isPrereqDone
                          ? "bg-success/5 border-success/30"
                          : "bg-danger/5 border-danger/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isPrereqDone ? (
                          <CheckCircle2
                            className="w-4 h-4 text-success shrink-0"
                            strokeWidth={1.5}
                          />
                        ) : (
                          <Lock className="w-4 h-4 text-danger shrink-0" strokeWidth={1.5} />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {prereq.taskCode}
                            </span>
                            <Badge variant={isPrereqDone ? "success" : "danger"}>
                              {prereq.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted block mt-0.5 truncate">
                            {prereq.title}
                          </span>
                        </div>
                      </div>

                      {userRole === "PM" && (
                        <button
                          onClick={() => removeDependencyMutation.mutate(prereq.id)}
                          className="p-1.5 text-faint hover:text-danger transition-colors shrink-0"
                          title="Remove prerequisite"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Prerequisite Form (PM Only) */}
              {userRole === "PM" && (
                <div className="pt-4 border-t border-border space-y-3">
                  <span className="text-xs font-bold text-foreground block">
                    Define New Dependency (PM Only)
                  </span>

                  {dependencyError && (
                    <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
                      {dependencyError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <select
                      value={selectedPrereqId}
                      onChange={(e) => setSelectedPrereqId(e.target.value)}
                      className="flex-1 rounded-lg bg-surface-raised border border-border p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select a prerequisite deliverable...</option>
                      {availablePrereqs.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.taskCode}] {p.title} ({p.department} - {p.status})
                        </option>
                      ))}
                    </select>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (selectedPrereqId) {
                          addDependencyMutation.mutate(selectedPrereqId);
                        }
                      }}
                      disabled={!selectedPrereqId || addDependencyMutation.isPending}
                    >
                      <Plus className="w-4 h-4" strokeWidth={1.5} />
                      Add
                    </Button>
                  </div>
                  <p className="text-[11px] text-faint">
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
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Work Deliverables & Proof of Completion
                </h4>
                <p className="text-xs text-faint">
                  Internal engineers and PM upload Figma handoffs, Pull Requests, and asset URLs.
                </p>
              </div>

              {/* Attachments List */}
              <div className="space-y-2">
                {(!task.attachments || task.attachments.length === 0) && (
                  <EmptyState
                    title="No deliverables attached yet"
                    message="Upload a Figma handoff, PR link, or asset URL to prove completion."
                  />
                )}

                {(task.attachments || []).map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl bg-surface-raised/60 border border-border flex items-center justify-between gap-3 hover:border-primary/40 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/25 shrink-0">
                        {att.fileType?.includes("pr") ? (
                          <GitPullRequest className="w-4 h-4" strokeWidth={1.5} />
                        ) : (
                          <Paperclip className="w-4 h-4" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground block truncate">
                          {att.fileName}
                        </span>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary-tint hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <span className="truncate max-w-[320px]">{att.fileUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Attachment Form (Internal Team & PM) */}
              {userRole !== "CLIENT" && (
                <div className="pt-4 border-t border-border space-y-3">
                  <span className="text-xs font-bold text-foreground block">
                    Upload / Attach Deliverable
                  </span>
                  <div className="space-y-2.5">
                    <Input
                      type="text"
                      placeholder="Deliverable Name (e.g. Figma UI v2 or PR #42)"
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                    />
                    <Input
                      type="url"
                      placeholder="Deliverable URL (https://...)"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                    />
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        if (attachmentName && attachmentUrl) {
                          addAttachmentMutation.mutate();
                        }
                      }}
                      disabled={
                        !attachmentName || !attachmentUrl || addAttachmentMutation.isPending
                      }
                    >
                      {addAttachmentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4" strokeWidth={1.5} />
                      )}
                      Attach Deliverable
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: IMMUTABLE AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span>Immutable Audit Trail</span>
                </h4>
                <p className="text-xs text-faint">
                  Every field change, status transition, and assignment is permanently logged.
                </p>
              </div>

              <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-[2px] before:bg-border">
                {(!task.auditLogs || task.auditLogs.length === 0) && (
                  <EmptyState
                    title="No audit records found"
                    message="Changes to this deliverable will appear here permanently."
                  />
                )}

                {(task.auditLogs || []).map((log) => (
                  <div key={log.id} className="relative flex items-start gap-4 pl-8 text-xs">
                    {/* Timeline bullet */}
                    <div className="absolute left-[13px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />

                    <div className="flex-1 rounded-xl bg-surface-raised/60 border border-border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="truncate">{log.user.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface text-faint font-mono shrink-0">
                            {log.user.role}
                          </span>
                        </span>
                        <span className="text-[10px] text-faint shrink-0">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-muted">
                        <span className="font-mono text-primary-tint">{log.action}</span>
                        {log.changedColumn && (
                          <span>
                            {" "}
                            on column <code className="text-foreground">[{log.changedColumn}]</code>
                          </span>
                        )}
                      </div>

                      {(log.oldValue || log.newValue) && (
                        <div className="text-[11px] font-mono p-1.5 rounded bg-background/60 border border-border text-muted">
                          {log.oldValue && <span className="text-danger">- {log.oldValue} </span>}
                          {log.newValue && <span className="text-success">+ {log.newValue}</span>}
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
        <div className="p-4 border-t border-border bg-surface/90 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
