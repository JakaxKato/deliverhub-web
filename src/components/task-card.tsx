"use client";

import { CheckCircle2, Clock, Eye, GitBranch, Loader2, Lock } from "lucide-react";
import type { Role, Task, TaskPrerequisite } from "../types";
import { Badge } from "./ui/badge";
import { Tooltip } from "./ui/tooltip";

interface TaskCardProps {
  task: Task;
  userRole?: Role;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: string, version: number) => void;
  isUpdating?: boolean;
}

const priorityVariant = {
  URGENT: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "neutral",
} as const;

const departmentVariant = {
  UIUX: "info",
  FRONTEND: "primary",
  BACKEND: "success",
  PRODUCT: "deep",
  CLIENT: "neutral",
} as const;

export function TaskCard({
  task,
  userRole,
  onSelectTask,
  onUpdateStatus,
  isUpdating = false,
}: TaskCardProps) {
  const pendingPrereqs: TaskPrerequisite[] = task.pendingPrerequisites || [];
  const dependencyCount = task.dependencies?.length ?? task.pendingPrerequisites?.length ?? 0;

  const blockedTooltip = (
    <div className="space-y-1.5">
      <p className="font-semibold text-danger">Waiting on incomplete prerequisites</p>
      <ul className="space-y-1">
        {pendingPrereqs.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-danger shrink-0" />
            <span className="font-mono text-[10px]">{p.taskCode}</span>
            <span className="truncate">{p.title}</span>
            <span className="ml-auto font-mono text-[10px] text-faint shrink-0">{p.status}</span>
          </li>
        ))}
        {pendingPrereqs.length === 0 && <li>See task details for the dependency chain.</li>}
      </ul>
    </div>
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: card contains nested action buttons, so a <button> wrapper is invalid HTML
    <div
      onClick={() => onSelectTask(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectTask(task);
        }
      }}
      className={`group relative rounded-xl p-4 cursor-pointer transition-all duration-200 ease-out animate-in ${
        task.isBlocked
          ? "bg-surface/70 border border-danger/30 hover:border-danger/50 opacity-90"
          : "bg-surface border border-border hover:border-primary/40 hover:shadow-glow hover:-translate-y-px"
      }`}
    >
      {/* Top Header: Code, Priority, Version */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-bold text-primary-tint">{task.taskCode}</span>
          <Badge variant={priorityVariant[task.priority] ?? "neutral"}>{task.priority}</Badge>
        </div>

        <span
          className="text-[10px] font-mono text-faint"
          title={`Optimistic Lock Version: ${task.version}`}
        >
          v{task.version}
        </span>
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary-tint transition-colors line-clamp-2 mb-1.5">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-xs text-muted line-clamp-2 mb-3">{task.description}</p>
      )}

      {/* Blocked State Notice */}
      {task.isBlocked && (
        <div className="mb-3 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold block text-[11px] uppercase tracking-wide">
              Blocked by Dependencies
            </span>
            <span className="text-[11px] text-danger/80 leading-tight block truncate">
              Waiting on:{" "}
              {pendingPrereqs.map((p) => p.taskCode).join(", ") || "incomplete prerequisites"}
            </span>
          </div>
        </div>
      )}

      {/* Footer: Department, Dependency Count, Client-Visible (PM only) */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border text-xs text-muted">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.department && (
            <Badge variant={departmentVariant[task.department] ?? "neutral"}>
              {task.department}
            </Badge>
          )}

          {dependencyCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-faint" title="Dependencies">
              <GitBranch className="w-3 h-3" strokeWidth={1.5} />
              {dependencyCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {userRole === "PM" &&
            (task.isClientVisible ? (
              <span
                title="Published to client portal"
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-deep/20 text-primary-tint border border-deep/40"
              >
                <Eye className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Client</span>
              </span>
            ) : null)}

          {task.assignee && (
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-tr from-deep to-primary text-white text-[9px] font-bold shrink-0"
              title={task.assignee.name}
            >
              {task.assignee.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Button based on State Permissions */}
      {userRole !== "CLIENT" && (
        <div className="mt-3 pt-2.5 border-t border-border" onClick={(e) => e.stopPropagation()}>
          {task.status === "TODO" && (
            <Tooltip
              content={
                task.isBlocked
                  ? blockedTooltip
                  : "Mark this deliverable as In Progress and start working."
              }
            >
              <button
                onClick={() => onUpdateStatus(task.id, "IN_PROGRESS", task.version)}
                disabled={isUpdating || task.isBlocked}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                  task.isBlocked
                    ? "bg-danger/5 text-danger/60 border border-danger/25 cursor-not-allowed"
                    : "bg-primary/10 hover:bg-primary/20 text-primary-tint border border-primary/30"
                }`}
              >
                {task.isBlocked ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Locked by Dependencies</span>
                  </>
                ) : isUpdating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                    <span>Start Deliverable</span>
                  </>
                )}
              </button>
            </Tooltip>
          )}

          {task.status === "BLOCKED" && (
            <Tooltip content={blockedTooltip}>
              <div className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-danger/5 text-danger/60 border border-danger/25 cursor-not-allowed">
                <Lock className="w-3 h-3" />
                <span>Locked: Awaiting Prerequisites</span>
              </div>
            </Tooltip>
          )}

          {task.status === "IN_PROGRESS" && (
            <Tooltip
              content={
                userRole === "PM"
                  ? "Product Managers cannot mark tasks as Done — only the assigned executor can complete a deliverable."
                  : "Mark this deliverable as Done."
              }
            >
              <button
                onClick={() => onUpdateStatus(task.id, "DONE", task.version)}
                disabled={isUpdating || userRole === "PM"}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                  userRole === "PM"
                    ? "bg-surface-raised text-faint border border-border cursor-not-allowed"
                    : "bg-success/10 hover:bg-success/20 text-success border border-success/30"
                }`}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                    <span>
                      {userRole === "PM" ? "PM Cannot Mark Done" : "Complete Deliverable"}
                    </span>
                  </>
                )}
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
