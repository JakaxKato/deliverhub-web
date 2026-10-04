"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Lock, Paperclip, X } from "lucide-react";
import { clientApi } from "../lib/client-api";
import type { ClientTask } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ErrorState } from "./ui-states";

interface ClientTaskDrawerProps {
  task: ClientTask;
  userId: string;
  onClose: () => void;
}

export function ClientTaskDrawer({ task: initialTask, userId, onClose }: ClientTaskDrawerProps) {
  const {
    data: task,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["task", "client", userId, initialTask.projectId, initialTask.id],
    queryFn: ({ signal }) => clientApi.task(initialTask.id, signal),
    initialData: initialTask,
    initialDataUpdatedAt: 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm animate-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-task-title"
        className="w-full max-w-2xl bg-surface border-l border-border h-full flex flex-col shadow-glow overflow-hidden animate-in"
      >
        <div className="p-5 border-b border-border bg-surface/90 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <span className="font-mono text-xs font-bold text-primary-tint">
              {initialTask.taskCode}
            </span>
            <h3 id="client-task-title" className="text-base font-bold text-foreground">
              {initialTask.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="p-1.5 rounded-lg text-faint hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isError ? (
            <ErrorState
              title="Unable to load this deliverable"
              message="It may no longer be published or accessible."
              onRetry={() => void refetch()}
            />
          ) : (
            <ClientTaskDetails task={task} />
          )}
        </div>
        <div className="p-4 border-t border-border bg-surface/90 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ClientTaskDetails({ task }: { task: ClientTask }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant={task.status === "DONE" ? "success" : "neutral"}>{task.status}</Badge>
        <Badge>{task.priority}</Badge>
      </div>
      {task.isBlocked && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>{task.blockedReason || "Waiting for prerequisite deliverables."}</span>
        </div>
      )}
      <div className="p-4 rounded-xl bg-surface-raised/50 border border-border text-xs text-muted leading-relaxed whitespace-pre-wrap">
        {task.description || "No description provided."}
      </div>
      {task.dueDate && (
        <p className="text-xs text-muted">Due {new Date(task.dueDate).toLocaleDateString()}</p>
      )}
      <section className="space-y-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
          Published prerequisites
        </h4>
        {task.dependencies.length === 0 && (
          <p className="text-xs text-muted">No published prerequisites.</p>
        )}
        {task.dependencies.map((prerequisite) => (
          <div
            key={prerequisite.id}
            className="p-3 rounded-xl bg-surface-raised/60 border border-border text-xs text-muted flex justify-between gap-3"
          >
            <span>
              <strong className="font-mono text-primary-tint">{prerequisite.taskCode}</strong>{" "}
              {prerequisite.title}
            </span>
            <Badge>{prerequisite.status}</Badge>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
          Deliverable files & links
        </h4>
        {task.attachments.length === 0 && (
          <p className="text-xs text-muted">No deliverables attached yet.</p>
        )}
        {task.attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={attachment.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-surface-raised/60 border border-border text-xs text-primary-tint flex items-center gap-2"
          >
            <Paperclip className="w-4 h-4 shrink-0" />
            <span className="truncate">{attachment.fileName}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ))}
      </section>
      <p className="text-xs text-faint">Updated {new Date(task.updatedAt).toLocaleDateString()}</p>
    </div>
  );
}
