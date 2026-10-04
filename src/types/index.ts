export type Role = "PM" | "MEMBER" | "CLIENT";
export type Department = "PRODUCT" | "UIUX" | "FRONTEND" | "BACKEND" | "CLIENT";
export type RegistrationDepartment = "UIUX" | "FRONTEND" | "BACKEND";
export type InternalDepartment = RegistrationDepartment;
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department;
  avatarUrl?: string | null;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  clientId?: string | null;
  client?: User | null;
  members: ProjectMember[];
  _count?: {
    tasks: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploaderId: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  createdAt: string;
  deletedAt: string | null;
  uploader: {
    id: string;
    name: string;
  };
}

export interface AuditLog {
  id: string;
  projectId: string;
  taskId?: string | null;
  userId: string;
  action: string;
  changedColumn?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
  user: {
    id: string;
    name: string;
    role: Role;
    department: Department;
    avatarUrl?: string | null;
  };
  task?: {
    id: string;
    taskCode: string;
    title: string;
    department: Department;
  };
}

export interface Comment {
  id: string;
  taskId: string;
  projectId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    role: Role;
    department: Department;
    avatarUrl?: string | null;
  };
  canDelete: boolean;
}

export interface TaskPrerequisite {
  id: string;
  taskCode: string;
  title: string;
  status: TaskStatus;
  department?: Department;
}

export interface TaskPermissions {
  canEdit: boolean;
  canStart: boolean;
  canComplete: boolean;
  canChangeStatus: boolean;
  canManageDependencies: boolean;
  canAttach: boolean;
  canDelete: boolean;
}

export interface Task {
  permissions: TaskPermissions;
  id: string;
  taskCode: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  department: Department;
  priority: Priority;
  isClientVisible: boolean;
  version: number;
  dueDate?: string | null;
  assigneeId?: string | null;
  assignee?: User | { name: string } | null;
  creatorId: string;
  creator?: { name: string; department?: Department };
  createdAt: string;
  updatedAt: string;
  isBlocked: boolean;
  blockedReason?: string | null;
  pendingPrerequisites: TaskPrerequisite[];
  dependencies?: { prerequisiteTask: TaskPrerequisite }[];
  dependents?: { task: TaskPrerequisite }[];
  attachments?: TaskAttachment[];
  auditLogs?: AuditLog[];
}

export interface ClientPrerequisite {
  id: string;
  taskCode: string;
  title: string;
  status: TaskStatus;
}

export interface ClientAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

export interface ClientTask {
  id: string;
  taskCode: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  isClientVisible: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: ClientAttachment[];
  dependencies: ClientPrerequisite[];
  isBlocked: boolean;
  blockedReason: string | null;
  pendingPrerequisites: ClientPrerequisite[];
}

export interface ClientProject {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { tasks: number };
}

export interface ClientProjectMetrics {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  todoTasks: number;
  percentageComplete: number;
  percentageFormatted: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ListResponse<T> extends ApiResponse<T[]> {
  meta: { page: number; rows: number; total: number; totalPages: number };
}

export type TaskListResponse<T> = ListResponse<T>;

export interface TaskConflict {
  success: false;
  error: "Conflict";
  message: string;
  latestData?: Task;
  serverVersion: number;
  clientVersion: number;
}

export interface ProjectMetrics extends ClientProjectMetrics {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  todoTasks: number;
  percentageComplete: number;
  percentageFormatted: string;
  departmentBreakdown: Record<string, { total: number; completed: number; inProgress: number }>;
}

export interface StandupSummary {
  projectId: string;
  projectName: string;
  date: string;
  summary: {
    completedYesterday: Record<
      string,
      { taskCode: string; title: string; completedBy: string; timestamp: string }[]
    >;
    blockedToday: Record<
      string,
      {
        taskCode: string;
        title: string;
        department: string;
        assigneeName: string;
        blockedReason: string;
      }[]
    >;
    inProgressToday: Record<
      string,
      { taskCode: string; title: string; department: string; assigneeName: string }[]
    >;
  };
  markdown: string;
}
