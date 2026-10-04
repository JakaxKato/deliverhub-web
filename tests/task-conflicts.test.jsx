import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AxiosError } from "axios";
import { renderToStaticMarkup } from "react-dom/server";
import { ConflictDialogView } from "../src/components/conflict-dialog";
import { api } from "../src/lib/api";
import { queryClient } from "../src/lib/query-client";
import { resetSessionData } from "../src/lib/session-cache";
import { taskApi } from "../src/lib/task-api";
import { useConflictStore } from "../src/stores/conflict-store";
import { attachment, response, task } from "./fixtures";

const originalAdapter = api.defaults.adapter;
const operations = [
  [
    "status",
    () => taskApi.updateStatus(task.id, { status: "IN_PROGRESS", version: 4 }),
    "patch",
    `/tasks/${task.id}/status`,
  ],
  [
    "details",
    () => taskApi.updateDetails(task.id, { description: "Draft", version: 4 }),
    "put",
    `/tasks/${task.id}`,
  ],
  [
    "add dependency",
    () => taskApi.addDependency(task.id, { prerequisiteTaskId: "prerequisite-1", version: 4 }),
    "post",
    `/tasks/${task.id}/dependencies`,
  ],
  [
    "remove dependency",
    () => taskApi.removeDependency(task.id, "prerequisite-1", 4),
    "delete",
    `/tasks/${task.id}/dependencies/prerequisite-1`,
  ],
  [
    "attachment",
    () =>
      taskApi.addAttachment(task.id, {
        version: 4,
        fileName: "Handoff",
        fileUrl: "https://example.test/file",
        fileType: "link",
        fileSize: 128,
      }),
    "post",
    `/tasks/${task.id}/attachments`,
  ],
  ["delete task", () => taskApi.delete(task.id, 4), "delete", `/tasks/${task.id}`],
];
const keys = ["tasks", "task", "metrics", "projects", "standup-summary"].map((prefix) => [
  prefix,
  "internal",
  "engineer-1",
  task.projectId,
]);

function conflictError(config) {
  return new AxiosError(
    "Conflict",
    "ERR_BAD_REQUEST",
    config,
    undefined,
    response(
      config,
      {
        success: false,
        error: "Conflict",
        message: "A newer task version exists.",
        latestData: { ...task, version: 5, status: "IN_PROGRESS" },
        serverVersion: 5,
        clientVersion: 4,
      },
      409,
    ),
  );
}

beforeEach(() => {
  resetSessionData("verified-test-token");
  for (const key of keys) queryClient.setQueryData(key, { cached: true });
});
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  resetSessionData();
});

describe("all supported versioned task writes", () => {
  for (const [name, run, method, url] of operations) {
    test(`${name} sends the expected version and invalidates related views on success`, async () => {
      let sent;
      api.defaults.adapter = async (config) => {
        sent = config;
        return response(config, { success: true, data: name === "attachment" ? attachment : task });
      };
      await run();
      expect(sent.method).toBe(method);
      expect(sent.url).toBe(url);
      expect(JSON.parse(sent.data).version).toBe(4);
      if (name === "attachment")
        expect(JSON.parse(sent.data)).toMatchObject({ fileType: "link", fileSize: 128 });
      for (const key of keys) expect(queryClient.getQueryState(key).isInvalidated).toBe(true);
      expect(useConflictStore.getState().isOpen).toBe(false);
    });
    test(`${name} opens the real conflict view and invalidates immediately on 409`, async () => {
      let requests = 0;
      api.defaults.adapter = async (config) => {
        requests += 1;
        throw conflictError(config);
      };
      await expect(run()).rejects.toThrow("Conflict");
      expect(requests).toBe(1);
      const state = useConflictStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.serverVersion).toBe(5);
      expect(state.clientVersion).toBe(4);
      for (const key of keys) expect(queryClient.getQueryState(key).isInvalidated).toBe(true);
      const html = renderToStaticMarkup(
        <ConflictDialogView
          state={state}
          onClose={state.closeConflict}
          onReload={async () => {}}
        />,
      );
      expect(html).toContain('role="alertdialog"');
      expect(html).toContain("A newer task version exists.");
      expect(html).toContain("Your version: v4");
      expect(html).toContain("Server version: v5");
      expect(html).toContain("Reload Latest Version");
      state.closeConflict();
      for (const key of keys) expect(queryClient.getQueryState(key).isInvalidated).toBe(true);
    });
  }
});

test("attachment returns the backend Attachment DTO rather than a Task", async () => {
  api.defaults.adapter = async (config) => response(config, { success: true, data: attachment });
  const result = await taskApi.addAttachment(task.id, {
    version: 4,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileType: "link",
  });
  expect(result.data).toEqual(attachment);
  expect(result.data.uploaderId).toBe(attachment.uploaderId);
  expect(result.data.deletedAt).toBeNull();
  expect(result.data).not.toHaveProperty("version");
  for (const key of keys) expect(queryClient.getQueryState(key).isInvalidated).toBe(true);
});

test("attachment rejects invalid or non-HTTPS URLs before dispatch", async () => {
  let requests = 0;
  api.defaults.adapter = async (config) => {
    requests += 1;
    return response(config, { success: true, data: attachment });
  };
  for (const fileUrl of [
    "http://example.test/file",
    "ftp://example.test/file",
    "javascript:alert(1)",
    "not a URL",
    "",
  ]) {
    await expect(
      taskApi.addAttachment(task.id, { version: 4, fileName: "Handoff", fileUrl }),
    ).rejects.toThrow("valid HTTPS URL");
  }
  expect(requests).toBe(0);
  expect(useConflictStore.getState().isOpen).toBe(false);
});

test("task creation accepts all three engineering departments", async () => {
  const sent = [];
  api.defaults.adapter = async (config) => {
    sent.push(JSON.parse(config.data).department);
    return response(config, { success: true, data: task });
  };
  for (const department of ["UIUX", "FRONTEND", "BACKEND"]) {
    await taskApi.create({
      projectId: task.projectId,
      title: "New task",
      description: "Specification",
      department,
      priority: "HIGH",
      isClientVisible: false,
      prerequisiteTaskIds: [],
    });
  }
  expect(sent).toEqual(["UIUX", "FRONTEND", "BACKEND"]);
});

test("task creation rejects injected PRODUCT, CLIENT or unknown departments before dispatch", async () => {
  let requests = 0;
  api.defaults.adapter = async (config) => {
    requests += 1;
    return response(config, { success: true, data: task });
  };
  for (const department of ["PRODUCT", "CLIENT", "UNKNOWN"]) {
    await expect(
      taskApi.create({
        projectId: task.projectId,
        title: "New task",
        description: "Specification",
        department,
        priority: "HIGH",
        isClientVisible: false,
        prerequisiteTaskIds: [],
      }),
    ).rejects.toThrow();
  }
  expect(requests).toBe(0);
});

test("creation sends the PM-selected assignee without inventing an existing-task version", async () => {
  let sent;
  api.defaults.adapter = async (config) => {
    sent = JSON.parse(config.data);
    return response(config, { success: true, data: task });
  };
  await taskApi.create({
    projectId: task.projectId,
    title: "New task",
    description: "Specification",
    department: "FRONTEND",
    priority: "HIGH",
    isClientVisible: false,
    prerequisiteTaskIds: [],
    assigneeId: task.assigneeId,
  });
  expect(sent.assigneeId).toBe(task.assigneeId);
  expect(sent).not.toHaveProperty("version");
});

test("creation also uses the shared conflict dialog handler", async () => {
  api.defaults.adapter = async (config) => {
    throw conflictError(config);
  };
  await expect(
    taskApi.create({
      projectId: task.projectId,
      title: "New task",
      description: "Specification",
      department: "FRONTEND",
      priority: "HIGH",
      isClientVisible: false,
      prerequisiteTaskIds: [],
    }),
  ).rejects.toThrow("Conflict");
  expect(useConflictStore.getState().isOpen).toBe(true);
  for (const key of keys) expect(queryClient.getQueryState(key).isInvalidated).toBe(true);
});

test("non-conflict failures do not open a concurrency dialog", async () => {
  api.defaults.adapter = async (config) => {
    throw new AxiosError(
      "Forbidden",
      "ERR_BAD_REQUEST",
      config,
      undefined,
      response(config, { message: "Forbidden" }, 403),
    );
  };
  await expect(taskApi.delete(task.id, 4)).rejects.toThrow("Forbidden");
  expect(useConflictStore.getState().isOpen).toBe(false);
});

test("an old-session conflict cannot repopulate conflict state after identity cleanup", async () => {
  let rejectRequest;
  api.defaults.adapter = (config) =>
    new Promise((_, reject) => {
      rejectRequest = () => reject(conflictError(config));
    });
  const pending = taskApi.updateDetails(task.id, { description: "Old identity draft", version: 4 });
  await Promise.resolve();
  await Promise.resolve();
  resetSessionData();
  rejectRequest();
  await expect(pending).rejects.toThrow("Session changed.");
  expect(useConflictStore.getState().isOpen).toBe(false);
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});
