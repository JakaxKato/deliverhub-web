export type Role = "PM" | "MEMBER" | "CLIENT";
export type Department = "PRODUCT" | "UIUX" | "FRONTEND" | "BACKEND" | "CLIENT";
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
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  createdAt: string;
  uploader?: {
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
  metadata?: any;
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

export interface TaskPrerequisite {
  id: string;
  taskCode: string;
  title: string;
  status: TaskStatus;
  department?: Department;
}

export interface Task {
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

export interface ProjectMetrics {
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
