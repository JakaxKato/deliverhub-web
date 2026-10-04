import type { taskApi } from "../src/lib/task-api";
import type { ApiResponse, RegistrationDepartment, TaskAttachment } from "../src/types";

type Assert<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type AttachmentResponseContract = Assert<
  Equal<Awaited<ReturnType<typeof taskApi.addAttachment>>, ApiResponse<TaskAttachment>>
>;
export type TaskCreationDepartmentContract = Assert<
  Equal<Parameters<typeof taskApi.create>[0]["department"], RegistrationDepartment>
>;
