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
import { Badge } from "./ui/badge";
import { EmptyState } from "./ui-states";

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
        <Badge variant="danger">
          <Lock className="w-3 h-3" strokeWidth={1.5} />
          Blocked
        </Badge>
      );
    }
    if (status === "DONE") {
      return (
        <Badge variant="success">
          <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
          Done
        </Badge>
      );
    }
    if (status === "IN_PROGRESS") {
      return (
        <Badge variant="primary">
          <Clock className="w-3 h-3" strokeWidth={1.5} />
          In Progress
        </Badge>
      );
    }
    return <Badge variant="neutral">Ready</Badge>;
  };

  return (
    <div className="space-y-4 animate-in">
      {/* EzFilter Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface/60 border border-border backdrop-blur-md">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search
              className="w-4 h-4 text-faint absolute left-3 top-2.5 pointer-events-none"
              strokeWidth={1.5}
            />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-background/60 border border-border text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-faint"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="rounded-lg bg-background/60 border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Rows:</span>
            <select
              value={rows}
              onChange={(e) => onRowsChange(Number(e.target.value))}
              className="rounded-lg bg-background/60 border border-border px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-surface/50 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-raised/60 text-xs font-semibold text-muted">
              <th
                onClick={() => onSortChange("taskCode")}
                className="py-3.5 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5 font-mono">
                  <span>Code</span>
                  <ArrowUpDown className="w-3 h-3" strokeWidth={1.5} />
                </div>
              </th>
              <th
                onClick={() => onSortChange("title")}
                className="py-3.5 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Deliverable Title</span>
                  <ArrowUpDown className="w-3 h-3" strokeWidth={1.5} />
                </div>
              </th>
              <th className="py-3.5 px-4">Status & Dependencies</th>
              <th className="py-3.5 px-4">Department</th>
              <th
                onClick={() => onSortChange("priority")}
                className="py-3.5 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Priority</span>
                  <ArrowUpDown className="w-3 h-3" strokeWidth={1.5} />
                </div>
              </th>
              <th className="py-3.5 px-4">Executor</th>
              <th className="py-3.5 px-4 text-center">Version</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs text-muted">
            {tasks.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="No deliverables match the current filters"
                    message="Adjust the search or status filter, or switch back to the board view."
                  />
                </td>
              </tr>
            )}

            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="hover:bg-surface-raised/60 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-mono font-bold text-primary-tint">{task.taskCode}</td>
                <td className="py-3 px-4 font-medium text-foreground max-w-xs truncate">
                  {task.title}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    <div>{getStatusBadge(task.status, task.isBlocked)}</div>
                    {task.isBlocked && (
                      <span className="text-[10px] text-danger/80 truncate max-w-[180px]">
                        {task.blockedReason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[11px] font-mono uppercase text-faint">
                    {task.department}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[11px] font-semibold text-foreground/80">
                    {task.priority}
                  </span>
                </td>
                <td className="py-3 px-4 text-muted">
                  {task.assignee ? task.assignee.name : "Unassigned"}
                </td>
                <td className="py-3 px-4 text-center font-mono text-faint">v{task.version}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(task);
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-surface-raised hover:bg-primary/10 text-primary-tint transition-colors duration-200"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border bg-surface-raised/40 flex items-center justify-between text-xs text-muted">
          <div>
            Showing Page <strong className="text-foreground font-mono">{page}</strong> of{" "}
            <strong className="text-foreground font-mono">{totalPages}</strong> ({total} total
            items)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <span className="font-mono px-2">{page}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
