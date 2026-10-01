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
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { ProgressRing } from "./ui/progress-ring";
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
    <div className="space-y-8 animate-in">
      {/* Hero: welcome + isolation notice + aggregate progress */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-6 md:p-8">
        <div className="absolute inset-0 bg-ambient pointer-events-none opacity-70" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary-tint text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Multi-Tenant Data Isolation Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {projectName}
              <span className="ml-3 inline-block align-middle font-mono text-sm font-bold text-primary-tint bg-deep/20 border border-deep/40 rounded-lg px-2 py-1">
                {projectKey}
              </span>
            </h1>
            <p className="text-xs md:text-sm text-muted leading-relaxed">
              Welcome to your dedicated client deliverable portal. Here you can track overall
              completion milestones and review approved deliverables in real-time.
            </p>
          </div>

          <div className="flex items-center gap-5 bg-background/50 p-5 rounded-2xl border border-border self-start">
            <ProgressRing value={percentage} size={96} label="Overall project completion" />
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold tracking-wider text-muted">
                Overall Progress
              </span>
              <span className="text-3xl font-extrabold text-gradient tabular-nums">
                {metrics?.percentageFormatted ?? `${percentage}%`}
              </span>
              <span className="text-xs text-faint font-mono mt-1">
                {metrics?.completedTasks || 0} / {metrics?.totalTasks || 0} Deliverables Done
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/25">
            <Layers className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-xs text-muted font-medium block">Total Deliverables</span>
            <span className="text-2xl font-extrabold text-foreground font-mono tabular-nums">
              {metrics?.totalTasks || 0}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10 text-success border border-success/25">
            <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-xs text-muted font-medium block">Completed & Verified</span>
            <span className="text-2xl font-extrabold text-success font-mono tabular-nums">
              {metrics?.completedTasks || 0}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-info/10 text-primary border border-info/25">
            <Clock className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-xs text-muted font-medium block">In Progress</span>
            <span className="text-2xl font-extrabold text-primary font-mono tabular-nums">
              {metrics?.inProgressTasks || 0}
            </span>
          </div>
        </Card>
      </div>

      {/* Client-Visible Deliverables List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>Published Project Deliverables</span>
            <span className="text-xs font-normal text-faint">
              ({tasks.length} client-visible deliverables)
            </span>
          </h2>
          <span className="hidden md:inline text-xs text-faint italic">
            Internal identities and comments are automatically masked by the API
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.length === 0 && (
            <div className="md:col-span-2 rounded-xl border border-border bg-surface/40">
              <EmptyState
                title="No client-visible deliverables published yet"
                message="The Product Manager has not flagged any deliverable as Client-Visible for this project."
              />
            </div>
          )}

          {tasks.map((task) => (
            // biome-ignore lint/a11y/useSemanticElements: card contains nested attachment links, so a <button> wrapper is invalid HTML
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTask(task);
                }
              }}
              className="p-5 rounded-xl bg-surface/80 border border-border hover:border-primary/40 hover:shadow-glow cursor-pointer transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary-tint">
                  {task.taskCode}
                </span>
                {task.status === "DONE" ? (
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                    Done
                  </Badge>
                ) : task.status === "IN_PROGRESS" ? (
                  <Badge variant="primary">
                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                    In Progress
                  </Badge>
                ) : (
                  <Badge variant="neutral">{task.status}</Badge>
                )}
              </div>

              <h3 className="text-sm font-bold text-foreground line-clamp-1">{task.title}</h3>

              {task.description && (
                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-[11px] font-semibold text-muted block">
                    Deliverable Files & Links:
                  </span>
                  {task.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary-tint hover:underline flex items-center gap-1.5"
                    >
                      <Paperclip className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span className="truncate">{att.fileName}</span>
                      <ExternalLink className="w-3 h-3 text-faint shrink-0" strokeWidth={1.5} />
                    </a>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-faint pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{task.assignee?.name || "NodeWave Specialist"}</span>
                </div>
                <span className="text-[11px] font-mono">
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
