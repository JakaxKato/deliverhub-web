"use client";

import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Paperclip,
  ShieldCheck,
  User,
} from "lucide-react";
import type { ProjectMetrics, Task } from "../types";
import { EmptyState } from "./ui-states";

interface ClientPortalProps {
  metrics?: ProjectMetrics;
  tasks: Task[];
  projectName?: string;
  projectKey?: string;
  onSelectTask: (task: Task) => void;
}

export function ClientPortalView({
  metrics,
  tasks,
  projectName = "Enterprise Deliverable Engine",
  projectKey = "NW-CORE",
  onSelectTask,
}: ClientPortalProps) {
  const percentage = metrics?.percentageComplete ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome & Security Isolation Notice */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/20 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Tenant Data Isolation Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {projectName}
              <span className="ml-3 inline-block align-middle font-mono text-sm font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 rounded-lg px-2 py-1">
                {projectKey}
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Welcome to your dedicated client deliverable portal. Here you can track overall
              completion milestones, deliverables, and review approved deliverables in real-time.
            </p>
          </div>

          {/* Aggregate Progress Radial / Counter */}
          <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-inner">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg
                aria-label="Progress radial meter"
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <title>Overall Completion Progress</title>
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${percentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-base font-extrabold text-white">
                {percentage}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Overall Progress
              </span>
              <span className="text-sm font-semibold text-cyan-300 font-mono">
                {metrics?.completedTasks || 0} / {metrics?.totalTasks || 0} Deliverables Done
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Deliverables</span>
            <span className="text-2xl font-black text-white font-mono">
              {metrics?.totalTasks || 0}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Completed & Verified</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {metrics?.completedTasks || 0}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">In Progress</span>
            <span className="text-2xl font-black text-sky-400 font-mono">
              {metrics?.inProgressTasks || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Client-Visible Deliverables List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Published Project Deliverables</span>
            <span className="text-xs font-normal text-slate-400">
              ({tasks.length} client-visible deliverables)
            </span>
          </h2>
          <span className="text-xs text-slate-400 italic">
            * Internal identities and comments automatically masked by API
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.length === 0 && (
            <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-[#0f172a]/40">
              <EmptyState
                title="No client-visible deliverables published yet"
                message="The Product Manager has not flagged any deliverable as Client-Visible for this project."
              />
            </div>
          )}

          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="p-5 rounded-2xl bg-[#0f172a]/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all shadow-md hover:shadow-cyan-500/5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400">{task.taskCode}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    task.status === "DONE"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  }`}
                >
                  {task.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{task.title}</h3>

              {task.description && (
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}

              {/* Attachments preview */}
              {task.attachments && task.attachments.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Deliverable Files & Links:
                  </span>
                  {task.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1.5"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{att.fileName}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{task.assignee?.name || "NodeWave Specialist"}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Updated {new Date(task.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
