import { z } from "zod";
import type {
  ApiResponse,
  ClientProject,
  ClientProjectMetrics,
  ClientTask,
  ListResponse,
} from "../types";
import { api } from "./api";
import { fetchAllPages } from "./pagination";

const status = z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]);
const prerequisite = z.object({
  id: z.string(),
  taskCode: z.string(),
  title: z.string(),
  status,
});

// Explicit schemas strip unexpected fields before client data enters the query cache.
// The backend must still enforce the whitelist before sending any response.
export const clientTaskSchema = z.object({
  id: z.string(),
  taskCode: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  isClientVisible: z.boolean(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  attachments: z.array(
    z.object({
      id: z.string(),
      fileName: z.string(),
      fileUrl: z.url({ protocol: /^https?$/ }),
      fileType: z.string().nullable().optional(),
      fileSize: z.number().nonnegative().nullable().optional(),
      createdAt: z.string(),
    }),
  ),
  dependencies: z.array(prerequisite),
  isBlocked: z.boolean(),
  blockedReason: z.string().nullable(),
  pendingPrerequisites: z.array(prerequisite),
});

export const clientProjectSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ tasks: z.number().nonnegative() }),
});

export const clientMetricsSchema = z.object({
  projectId: z.string(),
  totalTasks: z.number(),
  completedTasks: z.number(),
  inProgressTasks: z.number(),
  blockedTasks: z.number(),
  todoTasks: z.number(),
  percentageComplete: z.number(),
  percentageFormatted: z.string(),
});

export const clientApi = {
  projects: (signal?: AbortSignal): Promise<ClientProject[]> =>
    fetchAllPages(async (pagination) => {
      const response = await api.get<ListResponse<unknown>>("/projects", {
        params: pagination,
        signal,
      });
      return { ...response.data, data: z.array(clientProjectSchema).parse(response.data.data) };
    }, signal),
  tasks: (projectId: string, signal?: AbortSignal): Promise<ClientTask[]> =>
    fetchAllPages(async (pagination) => {
      const response = await api.get<ListResponse<unknown>>("/tasks", {
        params: { projectId, ...pagination },
        signal,
      });
      return { ...response.data, data: z.array(clientTaskSchema).parse(response.data.data) };
    }, signal),
  task: async (taskId: string, signal?: AbortSignal): Promise<ClientTask> => {
    const response = await api.get<ApiResponse<unknown>>(`/tasks/${taskId}`, { signal });
    return clientTaskSchema.parse(response.data.data);
  },
  metrics: async (projectId: string, signal?: AbortSignal): Promise<ClientProjectMetrics> => {
    const response = await api.get<ApiResponse<unknown>>(`/projects/${projectId}/metrics`, {
      signal,
    });
    return clientMetricsSchema.parse(response.data.data);
  },
};
