"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  GitPullRequest,
  History,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { api, getApiErrorMessage } from "../lib/api";
import { internalApi } from "../lib/internal-api";
import { queryClient } from "../lib/query-client";
import { useSessionMutation } from "../lib/session-mutation";
import { isSilentTaskError, taskApi } from "../lib/task-api";
import { beginDescriptionDraft, getTaskActions } from "../lib/task-permissions";
import { toast } from "../stores/toast-store";
import type { ApiResponse, Comment, Task, TaskPrerequisite, TaskStatus, User } from "../types";
import { AttachmentLinkForm } from "./attachment-link-form";
import { CommentComposer, type CommentFormValues } from "./comment-composer";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Textarea } from "./ui/input";
import { EmptyState, ErrorState } from "./ui-states";

interface TaskDrawerProps {
  task: Task;
  allTasks: Task[];
  user: User;
  onClose: () => void;
}

type DrawerTab = "overview" | "dependencies" | "attachments" | "comments" | "audit";

export function TaskDetailDrawer({ task: initialTask, allTasks, user, onClose }: TaskDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");

  // Form states for PM editing description
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(initialTask.description || "");
  const [descriptionVersion, setDescriptionVersion] = useState(initialTask.version);

  // Attachment form state
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType] = useState("link");

  // Dependency form state
  const [selectedPrereqId, setSelectedPrereqId] = useState("");
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch full details of this task including auditLogs
  const {
    data: task,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["task", "internal", user.id, initialTask.projectId, initialTask.id],
    queryFn: async ({ signal }) => {
      const res = await api.get<ApiResponse<Task>>(`/tasks/${initialTask.id}`, { signal });
      return res.data.data;
    },
    initialData: initialTask,
    initialDataUpdatedAt: 0,
    enabled: user.role === "PM" || user.role === "MEMBER",
  });
  const actions = getTaskActions(task, user);

  // Internal discussion is fetched separately and never included in the client task DTO.
  const commentsQuery = useQuery<Comment[]>({
    queryKey: ["comments", "internal", user.id, initialTask.projectId, initialTask.id],
    queryFn: ({ signal }) => internalApi.comments(initialTask.id, signal),
    enabled: user.role === "PM" || user.role === "MEMBER",
  });
  const comments = commentsQuery.data ?? [];

  // Mutation: Update Task Details (PM ONLY, with version optimistic locking)
  const updateDetailsMutation = useSessionMutation({
    mutationFn: (payload: { version: number; description?: string; isClientVisible?: boolean }) => {
      if (!actions.canEdit) throw new Error("Editing is not permitted.");
      return taskApi.updateDetails(task.id, payload);
    },
    onSuccess: () => {
      setIsEditingDescription(false);
      toast({ variant: "success", title: "Deliverable updated" });
    },
    onError: (err) => {
      if (isSilentTaskError(err)) return;
      toast({
        variant: "error",
        title: "Failed to update deliverable",
        description: getApiErrorMessage(err),
      });
    },
  });

  // Mutation: Status transition (executor-only, dependency-gated on the server)
  const updateStatusMutation = useSessionMutation({
    mutationFn: (status: TaskStatus) =>
      taskApi.updateStatus(task.id, { status, version: task.version }),
    onSuccess: () => {
      toast({ variant: "success", title: "Status updated" });
    },
    onError: (err) => {
      if (isSilentTaskError(err)) return;
      toast({
        variant: "error",
        title: "Failed to update status",
        description: getApiErrorMessage(err),
      });
    },
  });

  // Mutation: Add Dependency (PM ONLY)
  const addDependencyMutation = useSessionMutation({
    mutationFn: async (prerequisiteTaskId: string) => {
      setDependencyError(null);
      if (!actions.canManageDependencies) throw new Error("Dependency changes are not permitted.");
      return taskApi.addDependency(task.id, { prerequisiteTaskId, version: task.version });
    },
    onSuccess: () => {
      setSelectedPrereqId("");
      toast({ variant: "success", title: "Dependency added" });
    },
    onError: (err) => {
      if (isSilentTaskError(err)) return;
      setDependencyError(getApiErrorMessage(err, "Failed to add dependency."));
    },
  });

  // Mutation: Remove Dependency (PM ONLY)
  const removeDependencyMutation = useSessionMutation({
    mutationFn: async (prereqId: string) => {
      if (!actions.canManageDependencies) throw new Error("Dependency changes are not permitted.");
      return taskApi.removeDependency(task.id, prereqId, task.version);
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Dependency removed" });
    },
    onError: (err) => {
      if (isSilentTaskError(err)) return;
      setDependencyError(getApiErrorMessage(err, "Failed to remove dependency."));
    },
  });

  // Mutation: Add Attachment
  const addAttachmentMutation = useSessionMutation({
    mutationFn: async () => {
      if (!actions.canAttach) throw new Error("Attaching deliverables is not permitted.");
      return taskApi.addAttachment(task.id, {
        version: task.version,
        fileName: attachmentName,
        fileUrl: attachmentUrl,
        fileType: attachmentType,
      });
    },
    onSuccess: () => {
      setAttachmentName("");
      setAttachmentUrl("");
      toast({ variant: "success", title: "Deliverable attached" });
    },
    onError: (err) => {
      if (isSilentTaskError(err)) return;
      toast({
        variant: "error",
        title: "Failed to attach deliverable",
        description: getApiErrorMessage(err),
      });
    },
  });

  // Mutation: Post Comment (any internal actor on an accessible task)
  const addCommentMutation = useSessionMutation({
    mutationFn: (values: CommentFormValues) => internalApi.addComment(task.id, values.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments"] });
      toast({ variant: "success", title: "Comment posted" });
    },
    onError: (err) => {
      toast({
        variant: "error",
        title: "Failed to post comment",
        description: getApiErrorMessage(err),
      });
    },
  });

  // Mutation: Delete Comment (author or PM; soft delete preserves history)
  const deleteCommentMutation = useSessionMutation({
    mutationFn: (commentId: string) => internalApi.deleteComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments"] });
      toast({ variant: "success", title: "Comment deleted" });
    },
    onError: (err) => {
      toast({
        variant: "error",
        title: "Failed to delete comment",
        description: getApiErrorMessage(err),
      });
    },
  });

  const deleteTaskMutation = useSessionMutation({
    mutationFn: () => {
      if (!actions.canDelete) throw new Error("Deleting is not permitted.");
      return taskApi.delete(task.id, task.version);
    },
    onSuccess: () => {
      onClose();
      toast({ variant: "success", title: "Deliverable deleted" });
    },
    onError: (error) => {
      if (isSilentTaskError(error)) return;
      toast({
        variant: "error",
        title: "Failed to delete deliverable",
        description: getApiErrorMessage(error),
      });
    },
  });

  const isWriting =
    updateDetailsMutation.isPending ||
    addDependencyMutation.isPending ||
    removeDependencyMutation.isPending ||
    addAttachmentMutation.isPending ||
    addCommentMutation.isPending ||
    deleteCommentMutation.isPending ||
    deleteTaskMutation.isPending;

  if (user.role === "CLIENT") return null;
  if (isError)
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm">
        <div className="w-full max-w-2xl bg-surface p-6 space-y-4">
          <ErrorState
            title="Unable to load this task"
            message="It may no longer be accessible."
            onRetry={() => void refetch()}
          />
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );

  // Potential prerequisites to add (exclude self and already added)
  const existingDepIds = new Set(
    (task.dependencies || []).map((d) => d.prerequisiteTask?.id || ""),
  );
  const availablePrereqs = allTasks.filter((t) => t.id !== task.id && !existingDepIds.has(t.id));

  const tabs: { id: DrawerTab; label: string; hidden?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "dependencies", label: `Prerequisites (${(task.dependencies || []).length})` },
    { id: "attachments", label: `Deliverables (${(task.attachments || []).length})` },
    { id: "comments", label: `Comments (${comments.length})` },
    { id: "audit", label: "Audit Trail" },
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

              {/* Workflow action: dependency-gated, executor-only completion */}
              <div className="p-4 rounded-xl bg-surface-raised/50 border border-border space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider text-faint block">
                  Workflow Action
                </span>
                <div className="flex items-center gap-3">
                  {task.status === "TODO" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isWriting || !actions.canStart}
                      onClick={() => updateStatusMutation.mutate("IN_PROGRESS")}
                    >
                      <Play className="w-4 h-4" strokeWidth={1.5} />
                      Start Deliverable
                    </Button>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isWriting || !actions.canComplete}
                      onClick={() => updateStatusMutation.mutate("DONE")}
                    >
                      <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                      Complete Deliverable
                    </Button>
                  )}
                  {(task.status === "DONE" || task.status === "BLOCKED") && (
                    <span className="text-xs text-muted">
                      {task.status === "DONE"
                        ? "This deliverable is complete."
                        : "Locked until prerequisites are Done."}
                    </span>
                  )}
                </div>
                {task.status === "TODO" && !actions.canStart && (
                  <p className="text-[11px] text-faint">
                    {task.isBlocked
                      ? task.blockedReason || "Blocked by incomplete prerequisites."
                      : user.role === "PM"
                        ? "Only the assigned executor can start a deliverable."
                        : "Only the assigned engineer can start this deliverable."}
                  </p>
                )}
                {task.status === "IN_PROGRESS" && !actions.canComplete && (
                  <p className="text-[11px] text-faint">
                    {task.isBlocked
                      ? task.blockedReason || "Blocked by incomplete prerequisites."
                      : user.role === "PM"
                        ? "Product Managers cannot mark tasks as Done — only the assigned executor can."
                        : "Only the assigned engineer can complete this deliverable."}
                  </p>
                )}
              </div>

              {/* Core Description Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                    Task Description & Specification
                  </span>
                  {actions.canEdit && (
                    <button
                      disabled={isWriting}
                      onClick={() => {
                        if (isEditingDescription) {
                          updateDetailsMutation.mutate({
                            description: descriptionValue,
                            version: descriptionVersion,
                          });
                        } else {
                          const draft = beginDescriptionDraft(task);
                          setDescriptionValue(draft.description);
                          setDescriptionVersion(draft.version);
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
                      Concurrency protection active: Saving will verify draft version v
                      {descriptionVersion}.
                    </div>
                    <button
                      type="button"
                      disabled={isWriting}
                      onClick={() => setIsEditingDescription(false)}
                      className="text-xs text-faint hover:text-foreground"
                    >
                      Discard draft
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-raised/50 border border-border text-xs text-muted leading-relaxed whitespace-pre-wrap">
                    {task.description || "No description provided."}
                  </div>
                )}
              </div>

              {/* Client Visibility Toggle (PM Only) */}
              {actions.canEdit && (
                <div className="p-4 rounded-xl bg-surface-raised/50 border border-border flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      Client-Guest Visibility
                    </span>
                    <span className="text-[11px] text-faint block">
                      When enabled, approved public fields and deliverables are shared with the
                      client portal.
                    </span>
                  </div>
                  <button
                    disabled={isWriting}
                    onClick={() => {
                      const next = !task.isClientVisible;
                      updateDetailsMutation.mutate({
                        isClientVisible: next,
                        version: task.version,
                      });
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

                      {actions.canManageDependencies && (
                        <button
                          disabled={isWriting}
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
              {actions.canManageDependencies && (
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
                      disabled={!selectedPrereqId || isWriting}
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
              {actions.canAttach && (
                <div className="pt-4 border-t border-border space-y-3">
                  <span className="text-xs font-bold text-foreground block">
                    Upload / Attach Deliverable
                  </span>
                  <AttachmentLinkForm
                    name={attachmentName}
                    url={attachmentUrl}
                    isWriting={isWriting}
                    isPending={addAttachmentMutation.isPending}
                    onNameChange={setAttachmentName}
                    onUrlChange={setAttachmentUrl}
                    onAttach={() => addAttachmentMutation.mutate()}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTERNAL DISCUSSION / COMMENTS */}
          {activeTab === "comments" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span>Internal Discussion</span>
                </h4>
                <p className="text-xs text-faint">
                  Internal only. Comment history is never returned to the client portal.
                </p>
              </div>

              {commentsQuery.isError && (
                <ErrorState
                  title="Unable to load the discussion"
                  message="Retry to fetch internal comments for this deliverable."
                  onRetry={() => void commentsQuery.refetch()}
                />
              )}

              {!commentsQuery.isError && commentsQuery.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading discussion...
                </div>
              )}

              {!commentsQuery.isError && !commentsQuery.isPending && comments.length === 0 && (
                <EmptyState
                  title="No comments yet"
                  message="Start the discussion with an update, blocker, or review note."
                />
              )}

              <div className="space-y-2">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl bg-surface-raised/60 border border-border p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {comment.author.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-faint font-mono shrink-0">
                          {comment.author.department}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-faint">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                        {comment.canDelete && (
                          <button
                            type="button"
                            disabled={isWriting}
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="p-1 text-faint hover:text-danger transition-colors disabled:opacity-40"
                            aria-label="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted whitespace-pre-wrap leading-relaxed">
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <CommentComposer
                  isPending={addCommentMutation.isPending}
                  onSubmit={async (values) => {
                    await addCommentMutation.mutateAsync(values);
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 5: IMMUTABLE AUDIT TRAIL */}
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
        <div className="p-4 border-t border-border bg-surface/90 flex justify-end gap-3">
          {actions.canDelete && (
            <Button
              variant="danger"
              size="sm"
              disabled={isWriting}
              onClick={() => {
                if (confirmDelete) deleteTaskMutation.mutate();
                else setConfirmDelete(true);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? "Confirm Delete" : "Delete Task"}
            </Button>
          )}
          {confirmDelete && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isWriting}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel Delete
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
