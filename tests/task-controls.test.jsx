import { describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { AttachmentLinkForm } from "../src/components/attachment-link-form";
import { CreateTaskModal } from "../src/components/create-task-modal";
import { TaskCard } from "../src/components/task-card";
import { TaskDetailDrawer } from "../src/components/task-detail-drawer";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { beginDescriptionDraft } from "../src/lib/task-permissions";
import { useAuthStore } from "../src/stores/auth-store";
import { member, pm, task } from "./fixtures";

function renderCard(value, user = member, isUpdating = false) {
  return renderToStaticMarkup(
    <TooltipProvider>
      <TaskCard
        task={value}
        user={user}
        onSelectTask={() => {}}
        onUpdateStatus={() => {}}
        isUpdating={isUpdating}
      />
    </TooltipProvider>,
  );
}

function button(markup, label) {
  const found = (markup.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []).find((html) =>
    html.includes(label),
  );
  expect(found).toBeDefined();
  return found;
}

function expectDisabled(markup, label) {
  expect(button(markup, label)).toMatch(/\sdisabled(?:=|\s|>)/);
}

function expectEnabled(markup, label) {
  expect(button(markup, label)).not.toMatch(/\sdisabled(?:=|\s|>)/);
}

describe("actual task action controls", () => {
  test("blocked TODO renders a disabled start control", () => {
    expectDisabled(renderCard({ ...task, isBlocked: true }), "Locked by Dependencies");
  });
  test("BLOCKED status renders a real disabled button", () => {
    expectDisabled(
      renderCard({ ...task, status: "BLOCKED", isBlocked: true }),
      "Locked: Awaiting Prerequisites",
    );
  });
  test("blocked IN_PROGRESS cannot complete", () => {
    expectDisabled(
      renderCard({ ...task, status: "IN_PROGRESS", isBlocked: true }),
      "Complete Deliverable",
    );
  });
  test("PM Done is disabled even when assigned and backend flags are permissive", () => {
    expectDisabled(
      renderCard({ ...task, status: "IN_PROGRESS", assigneeId: pm.id }, pm),
      "PM Cannot Mark Done",
    );
  });
  test("PM cannot start even if assigned", () => {
    expectDisabled(renderCard({ ...task, assigneeId: pm.id }, pm), "Start Deliverable");
  });
  test("only the MEMBER assignee can start and complete", () => {
    expectEnabled(renderCard(task), "Start Deliverable");
    expectEnabled(renderCard({ ...task, status: "IN_PROGRESS" }), "Complete Deliverable");
    const other = { ...member, id: "other-engineer" };
    expectDisabled(renderCard(task, other), "Start Deliverable");
    expectDisabled(renderCard({ ...task, status: "IN_PROGRESS" }, other), "Complete Deliverable");
  });
  test("unassigned tasks and missing permissions fail closed", () => {
    expectDisabled(renderCard({ ...task, assigneeId: null }), "Start Deliverable");
    expectDisabled(renderCard({ ...task, permissions: undefined }), "Start Deliverable");
    expectDisabled(
      renderCard({ ...task, status: "IN_PROGRESS", permissions: undefined }),
      "Complete Deliverable",
    );
  });
  test("server canStart/canComplete/canChangeStatus flags disable actual buttons", () => {
    expectDisabled(
      renderCard({ ...task, permissions: { ...task.permissions, canStart: false } }),
      "Start Deliverable",
    );
    expectDisabled(
      renderCard({ ...task, permissions: { ...task.permissions, canChangeStatus: false } }),
      "Start Deliverable",
    );
    expectDisabled(
      renderCard({
        ...task,
        status: "IN_PROGRESS",
        permissions: { ...task.permissions, canComplete: false },
      }),
      "Complete Deliverable",
    );
  });
  test("pending writes disable allowed actions", () => {
    expectDisabled(renderCard(task, member, true), "Updating...");
  });
  test("clients and missing identities have no transition controls", () => {
    expect(renderCard(task, { ...member, role: "CLIENT" })).not.toContain("Start Deliverable");
    expect(renderCard(task, null)).not.toContain("Start Deliverable");
  });
  test("internal drawer hides edits/attachment/dependency/delete actions without permissions", () => {
    const cache = new QueryClient();
    const denied = {
      ...task,
      permissions: Object.fromEntries(Object.keys(task.permissions).map((key) => [key, false])),
    };
    const html = renderToStaticMarkup(
      <QueryClientProvider client={cache}>
        <TaskDetailDrawer task={denied} allTasks={[]} user={pm} onClose={() => {}} />
      </QueryClientProvider>,
    );
    expect(html).not.toContain("Edit Description");
    expect(html).not.toContain("Published to Client");
    expect(html).not.toContain("Delete Task");
    cache.clear();
  });
});

function renderAttachmentForm(url, isWriting = false) {
  return renderToStaticMarkup(
    <AttachmentLinkForm
      name="Handoff"
      url={url}
      isWriting={isWriting}
      isPending={isWriting}
      onNameChange={() => {}}
      onUrlChange={() => {}}
      onAttach={() => {}}
    />,
  );
}

test("actual attachment form enables HTTPS only and explains invalid URLs", () => {
  expectEnabled(renderAttachmentForm("https://example.test/file"), "Attach Deliverable");
  for (const url of ["http://example.test/file", "ftp://example.test/file", "not a URL"]) {
    const html = renderAttachmentForm(url);
    expectDisabled(html, "Attach Deliverable");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Use a valid HTTPS URL on a public hostname");
    expect(html).toContain('aria-invalid="true"');
  }
  expectDisabled(renderAttachmentForm(""), "Attach Deliverable");
});

test("actual attachment form stays disabled during another write", () => {
  expectDisabled(renderAttachmentForm("https://example.test/file", true), "Attach Deliverable");
});

test("actual create modal offers only the three engineering departments", () => {
  const cache = new QueryClient();
  const initialState = useAuthStore.getInitialState();
  const originalUser = initialState.user;
  initialState.user = pm;
  try {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={cache}>
        <CreateTaskModal
          projectId={task.projectId}
          userId={pm.id}
          members={[]}
          isOpen={true}
          onClose={() => {}}
          existingTasks={[]}
        />
      </QueryClientProvider>,
    );
    const selector = html.match(
      /<select\b[^>]*aria-label="Department"[^>]*>[\s\S]*?<\/select>/,
    )?.[0];
    expect(selector).toBeDefined();
    const values = Array.from(
      selector.matchAll(/<option\b[^>]*value="([^"]+)"/g),
      (match) => match[1],
    );
    expect(values).toEqual(["UIUX", "FRONTEND", "BACKEND"]);
    expect(selector).not.toContain("PRODUCT");
    expect(selector).not.toContain("CLIENT");
  } finally {
    initialState.user = originalUser;
    cache.clear();
  }
});

test("description drafts preserve their original base version across refreshed task data", () => {
  const draft = beginDescriptionDraft(task);
  draft.description = "Unsaved local edit";
  const refreshed = { ...task, version: 5, description: "Someone else's update" };
  expect(draft).toEqual({ description: "Unsaved local edit", version: 4 });
  expect(beginDescriptionDraft(refreshed)).toEqual({
    description: "Someone else's update",
    version: 5,
  });
});
