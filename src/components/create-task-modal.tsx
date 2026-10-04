"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Layers, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { getApiErrorMessage } from "../lib/api";
import { registrationDepartments } from "../lib/registration";
import { useSessionMutation } from "../lib/session-mutation";
import { isSilentTaskError, taskApi } from "../lib/task-api";
import { useAuthStore } from "../stores/auth-store";
import { toast } from "../stores/toast-store";
import type { ProjectMember, Task } from "../types";
import { Button } from "./ui/button";
import { FieldLabel, Input, Textarea } from "./ui/input";

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "A deliverable title is required.").max(200),
  description: z.string().trim().max(2000).optional(),
  department: z.enum(registrationDepartments),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional(),
  isClientVisible: z.boolean(),
});
type CreateTaskForm = z.infer<typeof createTaskSchema>;

interface CreateTaskModalProps {
  projectId: string;
  userId: string;
  members: ProjectMember[];
  isOpen: boolean;
  onClose: () => void;
  existingTasks: Task[];
}

export function CreateTaskModal({
  projectId,
  userId,
  members,
  isOpen,
  onClose,
  existingTasks,
}: CreateTaskModalProps) {
  const user = useAuthStore((state) => state.user);
  const engineers = members.filter((member) => member.user.role === "MEMBER");
  const [selectedPrereqIds, setSelectedPrereqIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      department: "FRONTEND",
      priority: "MEDIUM",
      assigneeId: "",
      isClientVisible: false,
    },
  });
  const assigneeId = useWatch({ control, name: "assigneeId" });

  const createTaskMutation = useSessionMutation({
    mutationFn: async (values: CreateTaskForm) => {
      setErrorMessage(null);
      if (user?.role !== "PM" || user.id !== userId) throw new Error("PM access required.");
      return taskApi.create({
        projectId,
        title: values.title,
        description: values.description ?? "",
        department: values.department,
        priority: values.priority,
        isClientVisible: values.isClientVisible,
        prerequisiteTaskIds: selectedPrereqIds,
        assigneeId: engineers.some((member) => member.userId === values.assigneeId)
          ? values.assigneeId || undefined
          : undefined,
      });
    },
    onSuccess: () => {
      reset();
      setSelectedPrereqIds([]);
      onClose();
      toast({ variant: "success", title: "Deliverable created" });
    },
    onError: (err) => {
      if (isSilentTaskError(err)) return;
      setErrorMessage(getApiErrorMessage(err, "Failed to create deliverable."));
    },
  });

  if (!isOpen || user?.role !== "PM" || user.id !== userId) return null;

  const togglePrereq = (id: string) => {
    setSelectedPrereqIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-md p-4 animate-in">
      <div className="w-full max-w-xl rounded-2xl border border-border glass bg-surface p-6 shadow-glow space-y-5 animate-in-scale">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/25">
              <Layers className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Create New Deliverable</h3>
              <p className="text-xs text-faint">Add a project task with dependencies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-faint hover:text-foreground hover:bg-surface-raised transition-colors"
            aria-label="Close create task modal"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div>
            <FieldLabel>Title *</FieldLabel>
            <Input
              type="text"
              placeholder="e.g. Design Payment Checkout Flow"
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            {errors.title && (
              <p role="alert" className="text-xs text-danger mt-1.5">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              placeholder="Describe deliverables and acceptance criteria..."
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Department</FieldLabel>
              <select
                aria-label="Department"
                className="w-full rounded-lg bg-surface-raised border border-border p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                {...register("department")}
              >
                <option value="UIUX">UI/UX Design</option>
                <option value="FRONTEND">Frontend Engineering</option>
                <option value="BACKEND">Backend Engineering</option>
              </select>
            </div>

            <div>
              <FieldLabel>Priority</FieldLabel>
              <select
                className="w-full rounded-lg bg-surface-raised border border-border p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                {...register("priority")}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <FieldLabel>Assigned Executor</FieldLabel>
            <select
              aria-label="Assigned executor"
              className="w-full rounded-lg bg-surface-raised border border-border p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              {...register("assigneeId")}
            >
              <option value="">Unassigned</option>
              {engineers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user.name} ({member.user.department})
                </option>
              ))}
            </select>
            {!assigneeId && (
              <p className="text-[11px] text-warning mt-1">
                An assigned engineer is required before this task can be started or completed.
              </p>
            )}
          </div>

          {/* Prerequisite Selection */}
          <div>
            <FieldLabel>Prerequisite Dependencies (Optional)</FieldLabel>
            <p className="text-[11px] text-faint mb-2">
              If selected, this task will be automatically BLOCKED until these prerequisites are
              DONE.
            </p>
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-background/60 border border-border">
              {existingTasks.length === 0 && (
                <div className="text-center text-faint py-2">No other tasks to depend on.</div>
              )}
              {existingTasks.map((t) => {
                const isSelected = selectedPrereqIds.includes(t.id);
                return (
                  // biome-ignore lint/a11y/useSemanticElements: selection row contains a custom checkbox visual, not a form control
                  <div
                    key={t.id}
                    onClick={() => togglePrereq(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePrereq(t.id);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30 text-foreground"
                        : "hover:bg-surface-raised/60 text-muted"
                    }`}
                  >
                    <span className="truncate pr-2">
                      <strong className="font-mono text-primary-tint">[{t.taskCode}]</strong>{" "}
                      {t.title}
                    </span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        isSelected ? "bg-primary border-primary text-white" : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" strokeWidth={2} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Client visibility */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="clientVisible"
              className="rounded bg-surface-raised border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              {...register("isClientVisible")}
            />
            <label htmlFor="clientVisible" className="text-muted cursor-pointer">
              Publish approved fields and deliverables to the client portal
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit((values) => createTaskMutation.mutate(values))}
            disabled={createTaskMutation.isPending}
          >
            {createTaskMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" strokeWidth={1.5} />
            )}
            {createTaskMutation.isPending ? "Creating..." : "Create Deliverable"}
          </Button>
        </div>
      </div>
    </div>
  );
}
