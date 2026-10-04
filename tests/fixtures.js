export const member = {
  id: "engineer-1",
  name: "Frontend Engineer",
  email: "engineer@example.test",
  role: "MEMBER",
  department: "FRONTEND",
};

export const pm = {
  ...member,
  id: "pm-1",
  name: "Product Manager",
  role: "PM",
  department: "PRODUCT",
};
export const client = {
  ...member,
  id: "client-1",
  name: "Client",
  role: "CLIENT",
  department: "CLIENT",
};

export const task = {
  id: "task-1",
  taskCode: "NW-1",
  projectId: "project-1",
  title: "Published checkout",
  description: "Approved public deliverable description",
  status: "TODO",
  department: "FRONTEND",
  priority: "HIGH",
  isClientVisible: true,
  version: 4,
  dueDate: null,
  assigneeId: member.id,
  assignee: member,
  creatorId: pm.id,
  creator: { name: "INTERNAL_CREATOR_SECRET" },
  createdAt: "2026-09-29T10:00:00Z",
  updatedAt: "2026-09-30T10:00:00Z",
  isBlocked: false,
  blockedReason: null,
  pendingPrerequisites: [],
  dependencies: [],
  dependents: [],
  attachments: [],
  auditLogs: [],
  permissions: {
    canEdit: true,
    canStart: true,
    canComplete: true,
    canChangeStatus: true,
    canManageDependencies: true,
    canAttach: true,
    canDelete: true,
  },
};

export const attachment = {
  id: "attachment-1",
  taskId: task.id,
  uploaderId: member.id,
  fileName: "Handoff",
  fileUrl: "https://example.test/file",
  fileType: "link",
  fileSize: 128,
  createdAt: task.createdAt,
  deletedAt: null,
  uploader: { id: member.id, name: member.name },
};

export const clientTask = {
  id: task.id,
  taskCode: task.taskCode,
  projectId: task.projectId,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  isClientVisible: true,
  dueDate: null,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  attachments: [
    {
      id: "file-1",
      fileName: "Approved handoff",
      fileUrl: "https://example.test/handoff",
      fileType: "link",
      fileSize: null,
      createdAt: task.createdAt,
    },
  ],
  dependencies: [
    {
      id: "visible-prerequisite",
      taskCode: "NW-0",
      title: "Published prerequisite",
      status: "DONE",
    },
  ],
  isBlocked: false,
  blockedReason: null,
  pendingPrerequisites: [],
};

export function response(config, data, status = 200) {
  return { config, data, status, statusText: status === 200 ? "OK" : "Error", headers: {} };
}
