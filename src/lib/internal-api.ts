import type { ApiResponse, Comment, ListResponse, Project, Task } from "../types";
import { api } from "./api";
import { fetchAllPages, validateListPage } from "./pagination";

export const internalApi = {
  projects: (signal?: AbortSignal): Promise<Project[]> =>
    fetchAllPages(async (pagination) => {
      const response = await api.get<ListResponse<Project>>("/projects", {
        params: pagination,
        signal,
      });
      return response.data;
    }, signal),

  tasks: (projectId: string, signal?: AbortSignal): Promise<Task[]> =>
    fetchAllPages(async (pagination) => {
      const response = await api.get<ListResponse<Task>>("/tasks", {
        params: { projectId, ...pagination },
        signal,
      });
      return response.data;
    }, signal),

  taskPage: async (
    projectId: string,
    params: Record<string, string | number> & { page: number; rows: number },
    signal?: AbortSignal,
  ): Promise<ListResponse<Task>> => {
    const response = await api.get<ListResponse<Task>>("/tasks", {
      params: { ...params, projectId },
      signal,
    });
    return validateListPage(response.data, params.page, params.rows);
  },

  comments: (taskId: string, signal?: AbortSignal): Promise<Comment[]> =>
    fetchAllPages(async (pagination) => {
      const response = await api.get<ListResponse<Comment>>("/comments", {
        params: { taskId, ...pagination },
        signal,
      });
      return response.data;
    }, signal),

  addComment: async (taskId: string, body: string): Promise<Comment> => {
    const response = await api.post<ApiResponse<Comment>>("/comments", { taskId, body });
    if (!response.data.success) throw new Error("The comment was not accepted.");
    return response.data.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/comments/${commentId}`);
  },
};
