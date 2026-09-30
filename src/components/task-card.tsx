"use client";

import { CheckCircle2, Clock, Eye, EyeOff, Lock, Paperclip } from "lucide-react";
import type { Role, Task } from "../types";

interface TaskCardProps {
  task: Task;
  userRole?: Role;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: string, version: number) => void;
  isUpdating?: boolean;
}

export function TaskCard({
  task,
  userRole,
  onSelectTask,
  onUpdateStatus,
  isUpdating = false,
}: TaskCardProps) {
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-rose-400 bg-rose-500/10 border-rose-500/30";
      case "HIGH":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "MEDIUM":
        return "text-sky-400 bg-sky-500/10 border-sky-500/30";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  const getDeptBadge = (dept: string) => {
    switch (dept) {
      case "UIUX":
        return "text-pink-400 bg-pink-500/10 border-pink-500/20";
      case "FRONTEND":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      case "BACKEND":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "PRODUCT":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      default:
        return "text-slate-400 bg-slate-800 border-slate-700";
    }
  };

  // State-based button permissions
  const _canStartTask = () => {
    if (task.status !== "TODO" && task.status !== "BLOCKED") return false;
    if (task.isBlocked) return false; // Strictly blocked!
    return true;
  };

  const _canCompleteTask = () => {
    if (task.status !== "IN_PROGRESS") return false;
    // CRITICAL: PM CANNOT mark task as Done!
    if (userRole === "PM") return false;
    return true;
  };

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`group relative rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        task.isBlocked
          ? "bg-slate-900/80 border border-rose-500/30 hover:border-rose-500/50 shadow-md"
          : "bg-[#111827]/80 hover:bg-[#151f33] border border-slate-800 hover:border-cyan-500/30 shadow-md hover:shadow-cyan-500/5"
      }`}
    >
      {/* Top Header: Code, Badges & Version */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-cyan-400">{task.taskCode}</span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityStyle(
              task.priority,
            )}`}
          >
            {task.priority}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {task.isClientVisible ? (
            <span
              title="Client Visible"
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"
            >
              <Eye className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Client</span>
            </span>
          ) : (
            <span
              title="Internal Only"
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 flex items-center gap-1"
            >
              <EyeOff className="w-2.5 h-2.5" />
            </span>
          )}

          <span
            title={`Optimistic Lock Version: ${task.version}`}
            className="text-[10px] font-mono text-slate-500 px-1 py-0.2 rounded bg-slate-800/80 border border-slate-700/50"
          >
            v{task.version}
          </span>
        </div>
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{task.description}</p>
      )}

      {/* Blocked State Warning Badge */}
      {task.isBlocked && (
        <div className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-pulse">
          <Lock className="w-3.5 h-3.5 mt-0.5 text-rose-400 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-[11px] uppercase tracking-wide text-rose-400">
              Dependency Blocked
            </span>
            <span className="text-[11px] leading-tight block">
              {task.blockedReason || "Requires incomplete prerequisite tasks"}
            </span>
          </div>
        </div>
      )}

      {/* Footer Info: Department, Assignee, Attachments */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {task.department && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${getDeptBadge(
                task.department,
              )}`}
            >
              {task.department}
            </span>
          )}

          {task.assignee && (
            <span className="text-[11px] text-slate-300 font-medium truncate max-w-[100px]">
              {(task.assignee as any).name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.attachments && task.attachments.length > 0 && (
            <span
              title={`${task.attachments.length} Work Attachments`}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400"
            >
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length}</span>
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Button based on State Permissions */}
      {userRole !== "CLIENT" && (
        <div
          className="mt-3 pt-2 border-t border-slate-800/60"
          onClick={(e) => e.stopPropagation()}
        >
          {task.status === "TODO" && (
            <button
              onClick={() => onUpdateStatus(task.id, "IN_PROGRESS", task.version)}
              disabled={isUpdating || task.isBlocked}
              title={
                task.isBlocked ? `Locked: ${task.blockedReason}` : "Start working on this task"
              }
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                task.isBlocked
                  ? "bg-rose-950/40 text-rose-400/60 border border-rose-900/40 cursor-not-allowed"
                  : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              }`}
            >
              {task.isBlocked ? (
                <>
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Locked by Dependencies</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Start Deliverable</span>
                </>
              )}
            </button>
          )}

          {task.status === "BLOCKED" && (
            <div
              title={`Locked: ${task.blockedReason}`}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-rose-950/40 text-rose-400/80 border border-rose-900/40 cursor-not-allowed"
            >
              <Lock className="w-3 h-3 text-rose-400" />
              <span>Locked: Awaiting Prerequisites</span>
            </div>
          )}

          {task.status === "IN_PROGRESS" && (
            <button
              onClick={() => onUpdateStatus(task.id, "DONE", task.version)}
              disabled={isUpdating || userRole === "PM"}
              title={
                userRole === "PM"
                  ? "Product Managers cannot mark tasks as Done. Only the assigned executor can complete it."
                  : "Mark deliverable as Done"
              }
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                userRole === "PM"
                  ? "bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                  : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{userRole === "PM" ? "PM Cannot Mark Done" : "Complete Deliverable"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
