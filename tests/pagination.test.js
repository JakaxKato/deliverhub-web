import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AxiosError } from "axios";
import { api } from "../src/lib/api";
import { clientApi } from "../src/lib/client-api";
import { internalApi } from "../src/lib/internal-api";
import { fetchAllPages } from "../src/lib/pagination";
import { resetSessionData } from "../src/lib/session-cache";
import { clientTask, response, task } from "./fixtures";

const originalAdapter = api.defaults.adapter;

beforeEach(() => resetSessionData("verified-paging-token"));
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  resetSessionData();
});

function pageBody(items, page = 1, rows = 20) {
  return {
    success: true,
    data: items.slice((page - 1) * rows, page * rows),
    meta: { page, rows, total: items.length, totalPages: Math.ceil(items.length / rows) },
  };
}

function projects(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `project-${index}`,
    key: `NW-${index}`,
    name: `Project ${index}`,
    description: null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    _count: { tasks: 1 },
    members: [{ userId: "INTERNAL_MEMBER" }],
    clientId: "INTERNAL_CLIENT_ID",
  }));
}

function tasks(count, client = false) {
  return Array.from({ length: count }, (_, index) => ({
    ...(client ? clientTask : task),
    id: `task-${index}`,
    taskCode: `NW-${index}`,
    title: index === count - 1 ? "Last-page prerequisite" : `Task ${index}`,
  }));
}

function serve(items, path) {
  const requests = [];
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe(path);
    expect(config.headers.get("Authorization")).toBe("Bearer verified-paging-token");
    requests.push(config);
    // Simulate the real backend's 20-row default when callers omit pagination.
    return response(
      config,
      pageBody(items, Number(config.params?.page ?? 1), Number(config.params?.rows ?? 20)),
    );
  };
  return requests;
}

describe("production list APIs consume all bounded pages", () => {
  test("internal project selectors include projects beyond the backend default first 20", async () => {
    const items = projects(205);
    const requests = serve(items, "/projects");
    const result = await internalApi.projects();
    expect(result).toHaveLength(205);
    expect(result[204].id).toBe("project-204");
    expect(requests.map((config) => config.params)).toEqual([
      { page: 1, rows: 100 },
      { page: 2, rows: 100 },
      { page: 3, rows: 100 },
    ]);
  });
  test("board and dependency-candidate source includes last-page tasks without table filters", async () => {
    const requests = serve(tasks(245), "/tasks");
    const result = await internalApi.tasks("project-1");
    expect(result).toHaveLength(245);
    expect(result[244].title).toBe("Last-page prerequisite");
    expect(requests).toHaveLength(3);
    for (const config of requests)
      expect(config.params).toMatchObject({ projectId: "project-1", rows: 100 });
    expect(requests[2].params.page).toBe(3);
    expect(requests[0].params).not.toHaveProperty("filters");
  });
  test("client project selectors collect every page while retaining the DTO whitelist", async () => {
    const requests = serve(projects(205), "/projects");
    const result = await clientApi.projects();
    expect(result).toHaveLength(205);
    expect(requests).toHaveLength(3);
    for (const project of result) {
      expect(project).not.toHaveProperty("members");
      expect(project).not.toHaveProperty("clientId");
    }
  });
  test("client deliverables collect every page and strip unexpected internal fields on every page", async () => {
    const items = tasks(205, true).map((item) => ({
      ...item,
      version: 99,
      department: "INTERNAL_DEPARTMENT",
      permissions: task.permissions,
    }));
    const requests = serve(items, "/tasks");
    const result = await clientApi.tasks("project-1");
    expect(result).toHaveLength(205);
    expect(result[204].title).toBe("Last-page prerequisite");
    expect(requests).toHaveLength(3);
    for (const item of result) {
      expect(item).not.toHaveProperty("version");
      expect(item).not.toHaveProperty("permissions");
      expect(item).not.toHaveProperty("department");
    }
  });
  test("table requests remain a single filtered current page with original metadata", async () => {
    const requests = serve(tasks(205), "/tasks");
    const filters = JSON.stringify({ status: "TODO" });
    const result = await internalApi.taskPage("project-1", {
      page: 3,
      rows: 20,
      filters,
      orderKey: "createdAt",
      orderRule: "desc",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].params).toEqual({
      projectId: "project-1",
      page: 3,
      rows: 20,
      filters,
      orderKey: "createdAt",
      orderRule: "desc",
    });
    expect(result.data).toHaveLength(20);
    expect(result.data[0].id).toBe("task-40");
    expect(result.meta).toEqual({ page: 3, rows: 20, total: 205, totalPages: 11 });
  });
  test("list cancellation signal reaches the Axios request", async () => {
    const controller = new AbortController();
    api.defaults.adapter = async (config) => {
      expect(config.signal).toBe(controller.signal);
      controller.abort();
      return response(config, pageBody(tasks(205), 1, 100));
    };
    await expect(internalApi.tasks("project-1", controller.signal)).rejects.toThrow();
  });
  test("a later-page server failure rejects instead of returning a truncated collection", async () => {
    let requests = 0;
    api.defaults.adapter = async (config) => {
      requests += 1;
      if (config.params.page === 2)
        throw new AxiosError(
          "Page two unavailable",
          "ERR_BAD_RESPONSE",
          config,
          undefined,
          response(config, { message: "Page two unavailable" }, 503),
        );
      return response(config, pageBody(tasks(205), 1, 100));
    };
    await expect(internalApi.tasks("project-1")).rejects.toThrow("Page two unavailable");
    expect(requests).toBe(2);
  });
});

describe("metadata, cancellation and collection bounds", () => {
  test("empty collections support totalPages zero or one", async () => {
    for (const totalPages of [0, 1]) {
      expect(
        await fetchAllPages(async () => ({
          success: true,
          data: [],
          meta: { page: 1, rows: 100, total: 0, totalPages },
        })),
      ).toEqual([]);
    }
  });
  test("valid collections can reach 1,000 pages without an arbitrary smaller item cap", async () => {
    let calls = 0;
    let lastOffset = -1;
    const result = await fetchAllPages(async ({ page, rows }) => {
      calls += 1;
      lastOffset = (page - 1) * rows;
      return {
        success: true,
        data: Array.from({ length: rows }, (_, index) => ({ id: `item-${lastOffset + index}` })),
        meta: { page, rows, total: 100000, totalPages: 1000 },
      };
    });
    expect(result).toHaveLength(100000);
    expect(calls).toBe(1000);
    expect(lastOffset).toBe(99900);
    expect(result[99999].id).toBe("item-99999");
  });
  test("larger collections fail explicitly before making an out-of-bound request", async () => {
    let calls = 0;
    await expect(
      fetchAllPages(async () => {
        calls += 1;
        return {
          success: true,
          data: tasks(100),
          meta: { page: 1, rows: 100, total: 100100, totalPages: 1001 },
        };
      }),
    ).rejects.toThrow("1,000-page safety bound");
    expect(calls).toBe(1);
  });
  for (const [label, meta] of [
    ["missing", undefined],
    ["infinite", { page: 1, rows: 100, total: Infinity, totalPages: Infinity }],
    ["negative", { page: 1, rows: 100, total: -1, totalPages: -1 }],
    ["fractional", { page: 1, rows: 100, total: 205, totalPages: 2.5 }],
    ["string", { page: 1, rows: 100, total: "205", totalPages: "3" }],
  ]) {
    test(`${label} metadata rejects rather than guessing or truncating`, async () => {
      await expect(
        fetchAllPages(async () => ({ success: true, data: tasks(100), meta })),
      ).rejects.toThrow("pagination metadata");
    });
  }
  test("a backend ignoring requested rows is detected", async () => {
    await expect(fetchAllPages(async () => pageBody(tasks(205)))).rejects.toThrow(
      "Inconsistent list pagination",
    );
  });
  test("an incomplete page despite valid metadata is detected", async () => {
    const body = pageBody(tasks(205), 1, 100);
    body.data.pop();
    await expect(fetchAllPages(async () => body)).rejects.toThrow("Inconsistent list pagination");
  });
  test("metadata changes during pagination reject the partial result", async () => {
    await expect(
      fetchAllPages(async ({ page, rows }) => pageBody(tasks(page === 1 ? 205 : 206), page, rows)),
    ).rejects.toThrow("list changed while loading");
  });
  test("duplicate IDs across pages reject a silently incomplete result", async () => {
    const items = tasks(205);
    await expect(
      fetchAllPages(async ({ page, rows }) => {
        const body = pageBody(items, page, rows);
        if (page === 2) body.data[0] = items[0];
        return body;
      }),
    ).rejects.toThrow("Duplicate entries");
  });
  test("an already-aborted operation sends no requests", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    await expect(
      fetchAllPages(async () => {
        calls += 1;
        return pageBody([]);
      }, controller.signal),
    ).rejects.toThrow("canceled");
    expect(calls).toBe(0);
  });
  test("abort or identity change after a page prevents further requests and partial results", async () => {
    for (const changeIdentity of [false, true]) {
      const controller = new AbortController();
      let calls = 0;
      await expect(
        fetchAllPages(async ({ page, rows }) => {
          calls += 1;
          if (changeIdentity) resetSessionData("different-token");
          else controller.abort();
          return pageBody(tasks(205), page, rows);
        }, controller.signal),
      ).rejects.toThrow("canceled or session changed");
      expect(calls).toBe(1);
    }
  });
});
