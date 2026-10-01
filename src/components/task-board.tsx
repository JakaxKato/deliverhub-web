"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, ListTodo, Lock, Plus, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { api, getApiErrorMessage } from "../lib/api";
import { useConflictStore } from "../stores/conflict-store";
import { toast } from "../stores/toast-store";
import type { Role, Task } from "../types";
import { TaskCard } from "./task-card";
import { EmptyState } from "./ui-states";

interface TaskBoardProps {
  tasks: Task[];
  userRole?: Role;
  onSelectTask: (task: Task) => void;
  onOpenCreateModal: () => void;
}

export function TaskBoard({ tasks, userRole, onSelectTask, onOpenCreateModal }: TaskBoardProps) {
  const queryClient = useQueryClient();
  const { openConflict } = useConflictStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");

  // Mutation: Update status (optimistic rollback handled by query invalidation)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
      version,
    }: {
      taskId: string;
      newStatus: string;
      version: number;
    }) => {
      const res = await api.patch(`/tasks/${taskId}/status`, {
        status: newStatus,
        version,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      toast({
        variant: "success",
        title:
          variables.newStatus === "DONE"
            ? "Deliverable completed"
            : variables.newStatus === "IN_PROGRESS"
              ? "Deliverable started"
              : "Status updated",
        description: data?.data?.taskCode,
      });
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
          title: "Status update failed",
          description: getApiErrorMessage(
            err,
            status === 422
              ? "This deliverable is blocked by incomplete prerequisites."
              : "Failed to update deliverable status.",
          ),
        });
      }
    },
  });

  const handleUpdateStatus = (taskId: string, newStatus: string, version: number) => {
    updateStatusMutation.mutate({ taskId, newStatus, version });
  };

  // Filter tasks based on search & filters
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.taskCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "ALL" || task.department === selectedDept;
    const matchesPriority = selectedPriority === "ALL" || task.priority === selectedPriority;
    return matchesSearch && matchesDept && matchesPriority;
  });

  // Categorize tasks into columns
  const todoTasks = filteredTasks.filter((t) => t.status === "TODO" && !t.isBlocked);
  const blockedTasks = filteredTasks.filter(
    (t) => t.status === "BLOCKED" || (t.status === "TODO" && t.isBlocked),
  );
  const inProgressTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = filteredTasks.filter((t) => t.status === "DONE");

  const columns = [
    {
      id: "TODO",
      title: "Ready for Work",
      count: todoTasks.length,
      tasks: todoTasks,
      icon: ListTodo,
      accent: "text-muted",
      badge: "bg-surface-raised text-muted border border-border",
    },
    {
      id: "BLOCKED",
      title: "Blocked",
      count: blockedTasks.length,
      tasks: blockedTasks,
      icon: Lock,
      accent: "text-danger",
      badge: "bg-danger/10 text-danger border border-danger/25",
    },
    {
      id: "IN_PROGRESS",
      title: "In Progress",
      count: inProgressTasks.length,
      tasks: inProgressTasks,
      icon: Clock,
      accent: "text-primary",
      badge: "bg-primary/10 text-primary-tint border border-primary/25",
    },
    {
      id: "DONE",
      title: "Done",
      count: doneTasks.length,
      tasks: doneTasks,
      icon: CheckCircle2,
      accent: "text-success",
      badge: "bg-success/10 text-success border border-success/25",
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Control Bar: Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface/60 border border-border backdrop-blur-md">
        <div className="flex items-center flex-1 min-w-[260px] max-w-md relative">
          <Search
            className="w-4 h-4 text-faint absolute left-3 pointer-events-none"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Search deliverables by title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-background/60 border border-border text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-faint transition-colors duration-200"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-lg bg-background/60 border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Departments</option>
            <option value="PRODUCT">Product</option>
            <option value="UIUX">UI/UX Design</option>
            <option value="FRONTEND">Frontend</option>
            <option value="BACKEND">Backend</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-lg bg-background/60 border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
            title="Refresh Deliverables"
            className="p-2 rounded-lg bg-background/60 border border-border text-faint hover:text-foreground hover:border-primary/50 transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {userRole === "PM" && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-primary to-deep hover:brightness-110 shadow-glow transition-all duration-200"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>New Deliverable</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {columns.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.id}
              className="rounded-xl bg-surface/50 border border-border p-4 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${col.accent}`} strokeWidth={1.5} />
                  <span className="text-xs font-bold text-foreground">{col.title}</span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badge}`}
                >
                  {col.count}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                {col.tasks.length === 0 && (
                  <EmptyState
                    title="No deliverables in this lane"
                    message={
                      col.id === "BLOCKED"
                        ? "Blocked tasks appear here automatically when a prerequisite is not Done yet."
                        : undefined
                    }
                  />
                )}

                {col.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    userRole={userRole}
                    onSelectTask={onSelectTask}
                    onUpdateStatus={handleUpdateStatus}
                    isUpdating={updateStatusMutation.isPending}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
