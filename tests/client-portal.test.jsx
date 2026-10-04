import { describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientPortalView } from "../src/components/client-portal-view";
import { ClientTaskDrawer } from "../src/components/client-task-drawer";
import { clientMetricsSchema, clientProjectSchema, clientTaskSchema } from "../src/lib/client-api";
import { client, clientTask, task } from "./fixtures";

const forbiddenTaskFields = [
  "version",
  "assigneeId",
  "assignee",
  "creatorId",
  "creator",
  "department",
  "auditLogs",
  "dependents",
  "permissions",
];

function safeTask() {
  return clientTaskSchema.parse({
    ...clientTask,
    ...Object.fromEntries(forbiddenTaskFields.map((key) => [key, "INTERNAL_SECRET"])),
    attachments: clientTask.attachments.map((file) => ({
      ...file,
      taskId: "INTERNAL_TASK_ID",
      uploader: { name: "INTERNAL_UPLOADER" },
    })),
    dependencies: clientTask.dependencies.map((item) => ({
      ...item,
      department: "INTERNAL_DEPARTMENT",
    })),
  });
}

describe("client DTO and actual rendered portal", () => {
  test("task whitelist excludes internal fields at every nested boundary", () => {
    const value = safeTask();
    expect(Object.keys(value).sort()).toEqual(Object.keys(clientTask).sort());
    for (const key of forbiddenTaskFields) expect(value).not.toHaveProperty(key);
    expect(value.attachments[0]).not.toHaveProperty("uploader");
    expect(value.attachments[0]).not.toHaveProperty("taskId");
    expect(value.dependencies[0]).not.toHaveProperty("department");
    expect(JSON.stringify(value)).not.toContain("INTERNAL_");
  });
  test("project and metrics schemas discard identities and department breakdown", () => {
    const project = clientProjectSchema.parse({
      id: "project-1",
      key: "NW",
      name: "Client Project",
      description: null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      _count: { tasks: 1, members: 10 },
      members: [{ name: "INTERNAL_MEMBER" }],
      clientId: "INTERNAL_ID",
      client: { email: "INTERNAL_EMAIL" },
    });
    expect(Object.keys(project).sort()).toEqual(
      ["id", "key", "name", "description", "createdAt", "updatedAt", "_count"].sort(),
    );
    expect(project._count).toEqual({ tasks: 1 });
    const metrics = clientMetricsSchema.parse({
      projectId: "project-1",
      totalTasks: 1,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      todoTasks: 1,
      percentageComplete: 0,
      percentageFormatted: "0%",
      departmentBreakdown: { FRONTEND: { name: "INTERNAL_SECRET" } },
    });
    expect(metrics).not.toHaveProperty("departmentBreakdown");
  });
  test("portal and client drawer render public content but no internal controls/fields", () => {
    const value = safeTask();
    const cache = new QueryClient();
    const portal = renderToStaticMarkup(
      <ClientPortalView tasks={[value]} projectName="Client Project" onSelectTask={() => {}} />,
    );
    const drawer = renderToStaticMarkup(
      <QueryClientProvider client={cache}>
        <ClientTaskDrawer task={value} userId={client.id} onClose={() => {}} />
      </QueryClientProvider>,
    );
    for (const html of [portal, drawer]) {
      expect(html).toContain("Approved handoff");
      expect(html).toContain("https://example.test/handoff");
      expect(html).not.toContain("INTERNAL_");
      for (const label of [
        "Lock Version",
        "Assigned Executor",
        "Department",
        "Audit Trail",
        "Edit Description",
        "Delete Task",
        "Upload / Attach",
        "Define New Dependency",
      ])
        expect(html).not.toContain(label);
    }
    expect(drawer).toContain("Published prerequisite");
    cache.clear();
  });
  test("client drawer never reads an internal task-detail cache entry", () => {
    const cache = new QueryClient();
    cache.setQueryData(["task", "internal", client.id, task.projectId, task.id], {
      ...task,
      title: "INTERNAL_CACHED_TITLE",
    });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={cache}>
        <ClientTaskDrawer task={safeTask()} userId={client.id} onClose={() => {}} />
      </QueryClientProvider>,
    );
    expect(html).not.toContain("INTERNAL_CACHED_TITLE");
    expect(html).toContain(clientTask.title);
    expect(
      cache.getQueryData(["task", "client", client.id, task.projectId, task.id]),
    ).not.toHaveProperty("version");
    cache.clear();
  });
  test("unsafe attachment protocols are rejected", () => {
    expect(() =>
      clientTaskSchema.parse({
        ...clientTask,
        attachments: [{ ...clientTask.attachments[0], fileUrl: "javascript:alert(1)" }],
      }),
    ).toThrow();
  });
});
