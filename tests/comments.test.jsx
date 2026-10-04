import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CommentComposer } from "../src/components/comment-composer";
import { api } from "../src/lib/api";
import { clientTaskSchema } from "../src/lib/client-api";
import { internalApi } from "../src/lib/internal-api";
import { resetSessionData } from "../src/lib/session-cache";
import { clientTask, member, response, task } from "./fixtures";

const originalAdapter = api.defaults.adapter;

beforeEach(() => {
  resetSessionData("verified-test-token");
});
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  resetSessionData();
});

const comment = {
  id: "comment-1",
  taskId: task.id,
  projectId: task.projectId,
  body: "Internal handoff note",
  createdAt: task.createdAt,
  updatedAt: task.createdAt,
  author: { id: member.id, name: member.name, role: member.role, department: member.department },
  canDelete: true,
};

describe("internal comment API contract", () => {
  test("lists comments scoped to a task with the complete-loading contract", async () => {
    const requested = [];
    api.defaults.adapter = async (config) => {
      requested.push(config);
      return response(config, {
        success: true,
        data: [comment, { ...comment, id: "comment-2" }, { ...comment, id: "comment-3" }],
        meta: { page: 1, rows: 100, total: 3, totalPages: 1 },
      });
    };
    const comments = await internalApi.comments(task.id);
    expect(comments.map((item) => item.id)).toEqual(["comment-1", "comment-2", "comment-3"]);
    expect(requested).toHaveLength(1);
    expect(requested[0].url).toBe("/comments");
    expect(requested[0].params.taskId).toBe(task.id);
  });

  test("posts a comment with the task id and body", async () => {
    let sent;
    api.defaults.adapter = async (config) => {
      sent = config;
      return response(config, { success: true, data: comment }, 201);
    };
    const created = await internalApi.addComment(task.id, "Internal handoff note");
    expect(sent.method).toBe("post");
    expect(sent.url).toBe("/comments");
    expect(JSON.parse(sent.data)).toEqual({ taskId: task.id, body: "Internal handoff note" });
    expect(created.id).toBe(comment.id);
  });

  test("deletes a comment by id", async () => {
    let sent;
    api.defaults.adapter = async (config) => {
      sent = config;
      return response(config, null, 204);
    };
    await internalApi.deleteComment(comment.id);
    expect(sent.method).toBe("delete");
    expect(sent.url).toBe(`/comments/${comment.id}`);
  });
});

describe("client masking of internal comments", () => {
  test("the client task schema discards comments and author identities", () => {
    const parsed = clientTaskSchema.parse({
      ...clientTask,
      department: "FRONTEND",
      comments: [{ id: "c1", body: "Secret debate", author: { name: member.name } }],
      auditLogs: [{ id: "a1", userId: member.id }],
    });
    expect(parsed).not.toHaveProperty("comments");
    expect(parsed).not.toHaveProperty("department");
    expect(parsed).not.toHaveProperty("auditLogs");
    expect(JSON.stringify(parsed)).not.toContain("Secret debate");
    expect(JSON.stringify(parsed)).not.toContain(member.name);
    // No client DTO ever carries the internal comment/version/audit feature flags.
    expect(parsed).not.toHaveProperty("version");
    expect(parsed).not.toHaveProperty("permissions");
  });
});

describe("comment composer", () => {
  test("renders an accessible composer that posts internal comments", () => {
    const html = renderToStaticMarkup(
      <CommentComposer onSubmit={async () => {}} isPending={false} />,
    );
    expect(html).toContain('aria-label="Add a comment"');
    expect(html).toContain("Post Comment");
    expect(html).toContain('role="alert"');
  });

  test("disables posting while a write is pending", () => {
    const html = renderToStaticMarkup(
      <CommentComposer onSubmit={async () => {}} isPending={true} />,
    );
    expect(html).toMatch(/<button[^>]*disabled/);
  });
});
