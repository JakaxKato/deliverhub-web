"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Layers, X } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import type { Department, Priority, Task } from "../types";

interface CreateTaskModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  existingTasks: Task[];
}

export function CreateTaskModal({
  projectId,
  isOpen,
  onClose,
  existingTasks,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<Department>("FRONTEND");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [selectedPrereqIds, setSelectedPrereqIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const res = await api.post("/tasks", {
        projectId,
        title,
        description,
        department,
        priority,
        isClientVisible,
        prerequisiteTaskIds: selectedPrereqIds,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTitle("");
      setDescription("");
      setSelectedPrereqIds([]);
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || "Failed to create deliverable.");
    },
  });

  if (!isOpen) return null;

  const togglePrereq = (id: string) => {
    setSelectedPrereqIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-[#0f172a] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Deliverable</h3>
              <p className="text-xs text-slate-400">Add a project task with dependencies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Title *</label>
            <input
              type="text"
              placeholder="e.g. Design Payment Checkout Flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description</label>
            <textarea
              placeholder="Describe deliverables and acceptance criteria..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="PRODUCT">Product Management</option>
                <option value="UIUX">UI/UX Design</option>
                <option value="FRONTEND">Frontend Engineering</option>
                <option value="BACKEND">Backend Engineering</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Prerequisite Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Prerequisite Dependencies (Optional)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              If selected, this task will be automatically BLOCKED until these prerequisites are
              DONE.
            </p>
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              {existingTasks.length === 0 && (
                <div className="text-center text-slate-500 py-2">No other tasks to depend on.</div>
              )}
              {existingTasks.map((t) => {
                const isSelected = selectedPrereqIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => togglePrereq(t.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                        : "hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    <span className="truncate pr-2">
                      <strong className="font-mono text-cyan-400">[{t.taskCode}]</strong> {t.title}
                    </span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        isSelected ? "bg-cyan-500 border-cyan-400 text-white" : "border-slate-700"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
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
              checked={isClientVisible}
              onChange={(e) => setIsClientVisible(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-400 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="clientVisible" className="text-slate-300 cursor-pointer">
              Publish as Client-Visible Deliverable (Identities automatically masked)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => createTaskMutation.mutate()}
            disabled={!title || createTaskMutation.isPending}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-500/20"
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Deliverable"}
          </button>
        </div>
      </div>
    </div>
  );
}
