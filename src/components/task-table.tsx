"use client";

import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Search,
} from "lucide-react";
import type { Task } from "../types";

interface TaskTableProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  page: number;
  rows: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onRowsChange: (newRows: number) => void;
  onSortChange: (key: string) => void;
  searchFilter: string;
  onSearchChange: (search: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export function TaskTable({
  tasks,
  onSelectTask,
  page,
  rows,
  total,
  onPageChange,
  onRowsChange,
  onSortChange,
  searchFilter,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: TaskTableProps) {
  const totalPages = Math.ceil(total / rows) || 1;

  const getStatusBadge = (status: string, isBlocked: boolean) => {
    if (isBlocked || status === "BLOCKED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Lock className="w-3 h-3 text-rose-400" />
          Blocked
        </span>
      );
    }
    if (status === "DONE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Done
        </span>
      );
    }
    if (status === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Clock className="w-3 h-3 text-cyan-400" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        Ready
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* EzFilter Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0f172a]/60 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search via searchFilters={'title':'...'}..."
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status exact filter */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Rows:</span>
            <select
              value={rows}
              onChange={(e) => onRowsChange(Number(e.target.value))}
              className="rounded-xl bg-slate-900 border border-slate-700 px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/40 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400">
              <th
                onClick={() => onSortChange("taskCode")}
                className="py-3.5 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5 font-mono">
                  <span>Code</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => onSortChange("title")}
                className="py-3.5 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Deliverable Title</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4">Status & Dependencies</th>
              <th className="py-3.5 px-4">Department</th>
              <th
                onClick={() => onSortChange("priority")}
                className="py-3.5 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Priority</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4">Executor</th>
              <th className="py-3.5 px-4 text-center">Version</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
            {tasks.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  No deliverables match the specified filters.
                </td>
              </tr>
            )}

            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-mono font-bold text-cyan-400">{task.taskCode}</td>
                <td className="py-3 px-4 font-medium text-slate-200 max-w-xs truncate">
                  {task.title}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    <div>{getStatusBadge(task.status, task.isBlocked)}</div>
                    {task.isBlocked && (
                      <span className="text-[10px] text-rose-400 truncate max-w-[180px]">
                        ⚠️ {task.blockedReason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    {task.department}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[11px] font-semibold">{task.priority}</span>
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {task.assignee ? task.assignee.name : "Unassigned"}
                </td>
                <td className="py-3 px-4 text-center font-mono text-slate-500">v{task.version}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task);
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <strong className="text-white font-mono">{page}</strong> of{" "}
            <strong className="text-white font-mono">{totalPages}</strong> ({total} total items)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">{page}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
