import axios, { type AxiosResponse } from "axios";
import { z } from "zod";
import { useConflictStore } from "../stores/conflict-store";
import type {
  ApiResponse,
  InternalDepartment,
  Priority,
  Task,
  TaskAttachment,
  TaskConflict,
  TaskStatus,
} from "../types";
import { api, getApiErrorMessage } from "./api";
import { getAttachmentLinkError } from "./attachment-link";
import { queryClient } from "./query-client";
import { registrationDepartments } from "./registration";
import { getSessionRevision } from "./session-cache";

const taskDepartmentSchema = z.enum(registrationDepartments);

export function invalidateTaskQueries() {
  return Promise.all(
    ["tasks", "task", "metrics", "projects", "standup-summary"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

export function handleTaskConflict(error: unknown): boolean {
  if (!axios.isAxiosError<TaskConflict>(error) || error.response?.status !== 409) return false;
  const conflict = error.response.data;
  // Refresh independently of whether the user dismisses the dialog or keeps a draft.
  void invalidateTaskQueries();
  useConflictStore.getState().openConflict({
    message: getApiErrorMessage(error, "This deliverable was updated by someone else."),
    latestData: conflict.latestData,
    serverVersion: conflict.serverVersion,
    clientVersion: conflict.clientVersion,
  });
  return true;
}

async function writeTask<T>(request: () => Promise<AxiosResponse<ApiResponse<T>>>) {
  const revision = getSessionRevision();
  try {
    const response = await request();
    if (revision !== getSessionRevision()) throw new axios.CanceledError("Session changed.");
    if (!response.data.success) throw new Error("The task update was not accepted.");
    void invalidateTaskQueries();
    return response.data;
  } catch (error) {
    if (revision !== getSessionRevision()) throw new axios.CanceledError("Session changed.");
    handleTaskConflict(error);
    throw error;
  }
}

export function isSilentTaskError(error: unknown) {
  return axios.isCancel(error) || (axios.isAxiosError(error) && error.response?.status === 409);
}

export const taskApi = {
  create: (payload: {
    projectId: string;
    title: string;
    description: string;
    department: InternalDepartment;
    priority: Priority;
    isClientVisible: boolean;
    prerequisiteTaskIds: string[];
    assigneeId?: string;
  }) =>
    writeTask(() => {
      taskDepartmentSchema.parse(payload.department);
      return api.post<ApiResponse<Task>>("/tasks", payload);
    }),

  delete: (taskId: string, version: number) =>
    writeTask(() => api.delete<ApiResponse<unknown>>(`/tasks/${taskId}`, { data: { version } })),

  updateStatus: (taskId: string, payload: { status: TaskStatus; version: number }) =>
    writeTask(() => api.patch<ApiResponse<Task>>(`/tasks/${taskId}/status`, payload)),

  updateDetails: (
    taskId: string,
    payload: { version: number; description?: string; isClientVisible?: boolean },
  ) => writeTask(() => api.put<ApiResponse<Task>>(`/tasks/${taskId}`, payload)),

  addDependency: (taskId: string, payload: { prerequisiteTaskId: string; version: number }) =>
    writeTask(() => api.post<ApiResponse<Task>>(`/tasks/${taskId}/dependencies`, payload)),

  removeDependency: (taskId: string, prerequisiteId: string, version: number) =>
    writeTask(() =>
      api.delete<ApiResponse<Task>>(`/tasks/${taskId}/dependencies/${prerequisiteId}`, {
        data: { version },
      }),
    ),

  addAttachment: (
    taskId: string,
    payload: {
      version: number;
      fileName: string;
      fileUrl: string;
      fileType?: string;
      fileSize?: number;
    },
  ) =>
    writeTask(() => {
      const urlError = getAttachmentLinkError(payload.fileUrl);
      if (urlError) throw new Error(urlError);
      return api.post<ApiResponse<TaskAttachment>>(`/tasks/${taskId}/attachments`, payload);
    }),
};
