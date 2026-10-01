"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, ListTodo, Lock, Plus, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { api, getApiErrorMessage } from "../lib/api";
import { useConflictStore } from "../stores/conflict-store";
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

  // Mutation: Update status
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        openConflict({
          message: getApiErrorMessage(err, "Concurrency conflict."),
          latestData: (err as { response?: { data?: { latestData?: Task } } })?.response?.data
            ?.latestData,
        });
      } else if (status === 422) {
        const blockedReason = (err as { response?: { data?: { blockedReason?: string } } })
          ?.response?.data?.blockedReason;
        alert(`Cannot start deliverable:\n${getApiErrorMessage(err)}\n${blockedReason || ""}`);
      } else {
        alert(getApiErrorMessage(err, "Failed to update deliverable status."));
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
      borderColor: "border-slate-700",
      badgeBg: "bg-slate-800 text-slate-300",
    },
    {
      id: "BLOCKED",
      title: "Blocked (Dependency Guard)",
      count: blockedTasks.length,
      tasks: blockedTasks,
      icon: Lock,
      borderColor: "border-rose-500/40",
      badgeBg: "bg-rose-500/20 text-rose-300",
    },
    {
      id: "IN_PROGRESS",
      title: "Active Deliverables",
      count: inProgressTasks.length,
      tasks: inProgressTasks,
      icon: Clock,
      borderColor: "border-cyan-500/40",
      badgeBg: "bg-cyan-500/20 text-cyan-300",
    },
    {
      id: "DONE",
      title: "Completed & Verified",
      count: doneTasks.length,
      tasks: doneTasks,
      icon: CheckCircle2,
      borderColor: "border-emerald-500/40",
      badgeBg: "bg-emerald-500/20 text-emerald-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Control Bar: Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0f172a]/60 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center flex-1 min-w-[260px] max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search deliverables by title or code (e.g. NW-CORE-001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <option value="ALL">All Departments</option>
            <option value="PRODUCT">Product</option>
            <option value="UIUX">UI/UX Design</option>
            <option value="FRONTEND">Frontend</option>
            <option value="BACKEND">Backend</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
            title="Refresh Deliverables"
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Create Task Button (PM Only) */}
          {userRole === "PM" && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
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
              className={`rounded-2xl bg-[#0b101d]/70 border ${col.borderColor} p-4 flex flex-col min-h-[500px] shadow-lg`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-200">{col.title}</span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}
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
