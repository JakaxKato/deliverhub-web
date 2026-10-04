import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AxiosError } from "axios";
import { api } from "../src/lib/api";
import { queryClient } from "../src/lib/query-client";
import { buildRegistrationPayload } from "../src/lib/registration";
import { useAuthStore } from "../src/stores/auth-store";
import { useConflictStore } from "../src/stores/conflict-store";
import { client, member, response, task } from "./fixtures";

const originalAdapter = api.defaults.adapter;
const originalWindow = globalThis.window;
const originalStorage = globalThis.localStorage;

beforeEach(() => {
  const entries = new Map();
  globalThis.localStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
    clear: () => entries.clear(),
  };
  globalThis.window = { location: { pathname: "/login", href: "/login" } };
  useAuthStore.getState().clearSession();
});
afterEach(() => {
  useAuthStore.getState().clearSession();
  api.defaults.adapter = originalAdapter;
  globalThis.window = originalWindow;
  globalThis.localStorage = originalStorage;
});

describe("registration contract", () => {
  for (const department of ["UIUX", "FRONTEND", "BACKEND"]) {
    test(`${department} always requests MEMBER even with an injected privileged role`, () => {
      expect(
        buildRegistrationPayload({
          name: "Engineer",
          email: "user@example.test",
          password: "TestPassword123!",
          department,
          role: "PM",
          permissions: { canDelete: true },
        }),
      ).toEqual({
        name: "Engineer",
        email: "user@example.test",
        password: "TestPassword123!",
        department,
        role: "MEMBER",
      });
    });
  }
  for (const department of ["PRODUCT", "CLIENT", "UNKNOWN"]) {
    test(`registration rejects ${department}`, () => {
      expect(() =>
        buildRegistrationPayload({
          name: "Engineer",
          email: "user@example.test",
          password: "TestPassword123!",
          department,
        }),
      ).toThrow();
    });
  }
});

describe("authentication identity boundaries", () => {
  test("login clears previous-identity task/project/summary caches and conflict state", () => {
    useAuthStore.getState().login("old-token", member);
    useAuthStore.getState().setActiveProjectId("old-project");
    queryClient.setQueryData(["task", "internal", member.id, task.id], task);
    queryClient.setQueryData(["standup-summary", "internal", member.id], {
      markdown: "INTERNAL_SECRET",
    });
    useConflictStore.getState().openConflict({ message: "Old session", latestData: task });
    useAuthStore.getState().login("client-token", client);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useConflictStore.getState().isOpen).toBe(false);
    expect(useAuthStore.getState().activeProjectId).toBeNull();
    expect(useAuthStore.getState().user).toEqual(client);
    expect(localStorage.getItem("nodewave_token")).toBe("client-token");
  });
  test("project changes close a previous project's conflict dialog", () => {
    useAuthStore.getState().login("token", member);
    useAuthStore.getState().setActiveProjectId("project-1");
    useConflictStore.getState().openConflict({ message: "Project one conflict", latestData: task });
    useAuthStore.getState().setActiveProjectId("project-2");
    expect(useConflictStore.getState().isOpen).toBe(false);
    expect(useConflictStore.getState().latestData).toBeNull();
  });
  test("explicit Bearer authorization is not replaced by a different stored token", async () => {
    localStorage.setItem("nodewave_token", "different-stored-token");
    api.defaults.adapter = async (config) => {
      expect(config.headers.get("Authorization")).toBe("Bearer captured-token");
      return response(config, { success: true, data: null });
    };
    await api.post("/auth/logout", undefined, {
      headers: { Authorization: "Bearer captured-token" },
    });
  });
  test("initialization verifies /auth/me before publishing cached identity and never discovers seeded users", async () => {
    localStorage.setItem("nodewave_token", "persisted-token");
    localStorage.setItem("nodewave_user", JSON.stringify({ ...member, role: "PM" }));
    const paths = [];
    let finish;
    api.defaults.adapter = (config) =>
      new Promise((resolve) => {
        paths.push(config.url);
        expect(config.headers.get("Authorization")).toBe("Bearer persisted-token");
        finish = () => resolve(response(config, { success: true, data: member }));
      });
    const pending = useAuthStore.getState().initAuth();
    await Promise.resolve();
    await Promise.resolve();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    finish();
    await pending;
    expect(paths).toEqual(["/auth/me"]);
    expect(useAuthStore.getState().user).toEqual(member);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState()).not.toHaveProperty("quickSwitch");
    expect(useAuthStore.getState()).not.toHaveProperty("seededUsers");
  });
  test("late /auth/me cannot replace a newly logged-in identity", async () => {
    localStorage.setItem("nodewave_token", "old-token");
    let finish;
    api.defaults.adapter = (config) =>
      new Promise((resolve) => {
        finish = () => resolve(response(config, { success: true, data: member }));
      });
    const pending = useAuthStore.getState().initAuth();
    await Promise.resolve();
    await Promise.resolve();
    useAuthStore.getState().login("new-token", client);
    finish();
    await pending;
    expect(useAuthStore.getState().user).toEqual(client);
    expect(useAuthStore.getState().token).toBe("new-token");
  });
  for (const failure of [false, true]) {
    test(`logout posts Bearer revocation then clears identity/cache (${failure ? "failed" : "successful"})`, async () => {
      useAuthStore.getState().login("revocation-token", member);
      queryClient.setQueryData(["tasks", "internal", member.id], [task]);
      useConflictStore.getState().openConflict({ message: "Old conflict", latestData: task });
      let calls = 0;
      api.defaults.adapter = async (config) => {
        calls += 1;
        expect(config.method).toBe("post");
        expect(config.url).toBe("/auth/logout");
        expect(config.headers.get("Authorization")).toBe("Bearer revocation-token");
        expect(useAuthStore.getState().token).toBe("revocation-token");
        if (failure)
          throw new AxiosError(
            "Revocation unavailable",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            response(config, {}, 401),
          );
        return response(config, "", 204);
      };
      await useAuthStore.getState().logout();
      expect(calls).toBe(1);
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
      expect(useConflictStore.getState().isOpen).toBe(false);
      expect(localStorage.getItem("nodewave_token")).toBeNull();
      expect(localStorage.getItem("nodewave_user")).toBeNull();
      if (failure) expect(state.logoutWarning).toContain("server session revocation failed");
      else expect(state.logoutWarning).toBeNull();
    });
  }
});
