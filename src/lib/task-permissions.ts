import type { Task, User } from "../types";

export function getTaskActions(task: Task, user?: User | null) {
  const internal = user?.role === "PM" || user?.role === "MEMBER";
  const executor = user?.role === "MEMBER" && user.id === task.assigneeId;
  const blocked = task.isBlocked || task.status === "BLOCKED";
  const permissions = task.permissions;

  return {
    canEdit: internal && permissions?.canEdit === true,
    canStart:
      executor &&
      !blocked &&
      task.status === "TODO" &&
      permissions?.canChangeStatus === true &&
      permissions?.canStart === true,
    canComplete:
      executor &&
      !blocked &&
      task.status === "IN_PROGRESS" &&
      permissions?.canChangeStatus === true &&
      permissions?.canComplete === true,
    canManageDependencies: internal && permissions?.canManageDependencies === true,
    canAttach: internal && permissions?.canAttach === true,
    canDelete: internal && permissions?.canDelete === true,
  };
}

export function beginDescriptionDraft(task: Task) {
  return { description: task.description ?? "", version: task.version };
}
