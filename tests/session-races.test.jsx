import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { renderToStaticMarkup } from "react-dom/server";
import { api } from "../src/lib/api";
import { queryClient } from "../src/lib/query-client";
import { getSessionIdentity } from "../src/lib/session-cache";
import { useSessionMutation } from "../src/lib/session-mutation";
import { taskApi } from "../src/lib/task-api";
import { listenForSessionStorageChanges, useAuthStore } from "../src/stores/auth-store";
import { useConflictStore } from "../src/stores/conflict-store";
import { installBrowser } from "./browser-fixture";
import { pm, response, task } from "./fixtures";

const pmB = { ...pm, id: "pm-b", name: "PM B", email: "pm-b@example.test" };
const originalAdapter = api.defaults.adapter;
let browser;
let stopListening;

beforeEach(() => {
  browser = installBrowser();
  useAuthStore.getState().clearSession();
  stopListening = listenForSessionStorageChanges();
});
afterEach(() => {
  stopListening();
  useAuthStore.getState().clearSession();
  api.defaults.adapter = originalAdapter;
  browser.restore();
});

function unauthorized(config) {
  return new AxiosError(
    "Unauthorized",
    "ERR_BAD_REQUEST",
    config,
    undefined,
    response(config, {}, 401),
  );
}

function seedPrivateState(user = pm) {
  queryClient.setQueryData(["task", "internal", user.id], task);
  useConflictStore.getState().openConflict({ message: "Draft conflict", latestData: task });
  useAuthStore.getState().setActiveProjectId("project-1");
  useConflictStore.getState().openConflict({ message: "Draft conflict", latestData: task });
}

function DraftHarness({ capture }) {
  const mutation = useSessionMutation({
    mutationFn: (draft) => taskApi.updateDetails(task.id, draft),
  });
  capture(mutation);
  return <button type="button">Save description</button>;
}

function captureDraftMutation() {
  const cache = new QueryClient({ defaultOptions: { mutations: { gcTime: 0, retry: false } } });
  let mutation;
  renderToStaticMarkup(
    <QueryClientProvider client={cache}>
      <DraftHarness
        capture={(value) => {
          mutation = value;
        }}
      />
    </QueryClientProvider>,
  );
  return { mutation, clear: () => cache.clear() };
}

describe("request identity and stale 401 handling", () => {
  for (const nextUser of [pmB, pm]) {
    test(`old 401 cannot clear a newer session (${nextUser.id})`, async () => {
      useAuthStore.getState().login("token-a", pm);
      let rejectOld;
      let oldHeader;
      api.defaults.adapter = (config) =>
        new Promise((_, reject) => {
          oldHeader = config.headers.get("Authorization");
          rejectOld = () => reject(unauthorized(config));
        });
      const pending = api.get("/projects");
      expect(oldHeader).toBe("Bearer token-a");
      useAuthStore.getState().login("token-b", nextUser);
      seedPrivateState(nextUser);
      rejectOld();
      await expect(pending).rejects.toThrow("Session changed");
      expect(localStorage.getItem("nodewave_token")).toBe("token-b");
      expect(useAuthStore.getState().user).toEqual(nextUser);
      expect(getSessionIdentity().token).toBe("token-b");
      expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
      expect(useConflictStore.getState().isOpen).toBe(true);
      expect(browser.browser.location.href).toBe("/");
    });
  }
  test("current-session 401 clears that session, cache and conflicts", async () => {
    useAuthStore.getState().login("token-a", pm);
    seedPrivateState();
    api.defaults.adapter = async (config) => {
      throw unauthorized(config);
    };
    await expect(api.get("/projects")).rejects.toThrow("Unauthorized");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(getSessionIdentity().token).toBeNull();
    expect(localStorage.getItem("nodewave_token")).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useConflictStore.getState().isOpen).toBe(false);
  });
  test("401 before a delayed storage event cannot delete the other tab's token", async () => {
    useAuthStore.getState().login("token-a", pm);
    let rejectOld;
    let verify;
    api.defaults.adapter = (config) =>
      new Promise((resolve, reject) => {
        if (config.url === "/auth/me") {
          expect(config.headers.get("Authorization")).toBe("Bearer token-b");
          verify = () => resolve(response(config, { success: true, data: pmB }));
        } else rejectOld = () => reject(unauthorized(config));
      });
    const old = api.get("/projects");
    localStorage.setItem("nodewave_token", "token-b");
    rejectOld();
    await expect(old).rejects.toThrow("Unauthorized");
    expect(localStorage.getItem("nodewave_token")).toBe("token-b");
    expect(useAuthStore.getState().user).toBeNull();
    verify();
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().user).toEqual(pmB);
  });
  test("successful old data is discarded if shared storage changes before its event", async () => {
    useAuthStore.getState().login("token-a", pm);
    let finishOld;
    let verify;
    api.defaults.adapter = (config) =>
      new Promise((resolve) => {
        if (config.url === "/auth/me")
          verify = () => resolve(response(config, { success: true, data: pmB }));
        else
          finishOld = () =>
            resolve(response(config, { success: true, data: [{ id: "PM_A_PRIVATE_PROJECT" }] }));
      });
    const old = api.get("/projects");
    localStorage.setItem("nodewave_token", "token-b");
    finishOld();
    await expect(old).rejects.toThrow("Session changed");
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem("nodewave_token")).toBe("token-b");
    verify();
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().user).toEqual(pmB);
  });
  test("private credentials cannot be supplied from an unverified stored token", async () => {
    localStorage.setItem("nodewave_token", "unverified-token");
    let sent = 0;
    api.defaults.adapter = async (config) => {
      sent += 1;
      return response(config, {});
    };
    await expect(
      api.get("/projects", { headers: { Authorization: "Bearer unverified-token" } }),
    ).rejects.toThrow("not been verified");
    expect(sent).toBe(0);
  });
});

describe("cross-tab verification and draft ownership", () => {
  test("storage switch clears private state immediately and blocks requests until /me verifies", async () => {
    useAuthStore.getState().login("token-a", pm);
    seedPrivateState();
    let finishVerification;
    const sent = [];
    api.defaults.adapter = (config) => {
      sent.push([config.url, config.headers.get("Authorization")]);
      if (config.url === "/auth/me")
        return new Promise((resolve) => {
          finishVerification = () => resolve(response(config, { success: true, data: pmB }));
        });
      return Promise.resolve(response(config, { success: true, data: [] }));
    };
    const signedOutTransitions = [];
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.isAuthenticated) signedOutTransitions.push(state.isLoading);
    });
    try {
      browser.switchToken("token-b");
      expect(signedOutTransitions.length).toBeGreaterThan(0);
      for (const isLoading of signedOutTransitions) expect(isLoading).toBe(true);
    } finally {
      unsubscribe();
    }
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(true);
    expect(useAuthStore.getState().activeProjectId).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useConflictStore.getState().isOpen).toBe(false);
    await expect(api.get("/projects")).rejects.toThrow("not been verified");
    expect(sent).toEqual([["/auth/me", "Bearer token-b"]]);
    finishVerification();
    await useAuthStore.getState().initAuth();
    await api.get("/projects");
    expect(sent[1]).toEqual(["/projects", "Bearer token-b"]);
    expect(useAuthStore.getState().user).toEqual(pmB);
  });
  test("changed storage detected before its event blocks an old draft instead of sending it under PM B", async () => {
    useAuthStore.getState().login("token-a", pm);
    let verify;
    const sent = [];
    api.defaults.adapter = (config) => {
      sent.push([config.url, config.headers.get("Authorization")]);
      return new Promise((resolve) => {
        verify = () => resolve(response(config, { success: true, data: pmB }));
      });
    };
    localStorage.setItem("nodewave_token", "token-b");
    await expect(
      taskApi.updateDetails(task.id, { version: 4, description: "PM A draft" }),
    ).rejects.toThrow("Session changed");
    expect(sent).toEqual([["/auth/me", "Bearer token-b"]]);
    verify();
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().user).toEqual(pmB);
  });
  for (const nextUser of [pmB, pm]) {
    test(`retained real mutation hook rejects PM A's draft after the new session verifies (${nextUser.id})`, async () => {
      useAuthStore.getState().login("token-a", pm);
      const draft = captureDraftMutation();
      const sent = [];
      api.defaults.adapter = async (config) => {
        sent.push(config.url);
        return response(config, { success: true, data: nextUser });
      };
      browser.switchToken("token-b");
      await useAuthStore.getState().initAuth();
      expect(useAuthStore.getState().user).toEqual(nextUser);
      await expect(
        draft.mutation.mutateAsync({ version: 4, description: "PM A private draft" }),
      ).rejects.toThrow("Session changed");
      expect(sent).toEqual(["/auth/me"]);
      draft.clear();
    });
  }
  test("a newly mounted verified-session mutation still sends normally", async () => {
    useAuthStore.getState().login("token-a", pm);
    const sent = [];
    api.defaults.adapter = async (config) => {
      sent.push([config.url, config.headers.get("Authorization")]);
      return response(config, { success: true, data: config.url === "/auth/me" ? pmB : task });
    };
    browser.switchToken("token-b");
    await useAuthStore.getState().initAuth();
    const draft = captureDraftMutation();
    await draft.mutation.mutateAsync({ version: 4, description: "PM B draft" });
    expect(sent).toEqual([
      ["/auth/me", "Bearer token-b"],
      [`/tasks/${task.id}`, "Bearer token-b"],
    ]);
    draft.clear();
  });
  test("an already-queued mutation cannot start under the new identity", async () => {
    useAuthStore.getState().login("token-a", pm);
    const draft = captureDraftMutation();
    const sent = [];
    api.defaults.adapter = async (config) => {
      sent.push(config.url);
      return response(config, { success: true, data: pmB });
    };
    const pending = draft.mutation.mutateAsync({ version: 4, description: "Queued PM A draft" });
    browser.switchToken("token-b");
    await expect(pending).rejects.toThrow("Session changed");
    await useAuthStore.getState().initAuth();
    expect(sent).toEqual(["/auth/me"]);
    draft.clear();
  });
  test("late verification for PM A cannot replace PM B or clear its token", async () => {
    localStorage.setItem("nodewave_token", "token-a");
    let finishA;
    let finishB;
    api.defaults.adapter = (config) =>
      new Promise((resolve) => {
        if (config.headers.get("Authorization") === "Bearer token-a")
          finishA = () => resolve(response(config, { success: true, data: pm }));
        else finishB = () => resolve(response(config, { success: true, data: pmB }));
      });
    const old = useAuthStore.getState().initAuth();
    browser.switchToken("token-b");
    finishA();
    await old;
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem("nodewave_token")).toBe("token-b");
    finishB();
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().user).toEqual(pmB);
  });
  test("failed cross-tab verification stays signed out and never sends private requests", async () => {
    useAuthStore.getState().login("token-a", pm);
    const sent = [];
    api.defaults.adapter = async (config) => {
      sent.push(config.url);
      throw unauthorized(config);
    };
    browser.switchToken("invalid-token-b");
    await useAuthStore.getState().initAuth();
    await expect(api.get("/projects")).rejects.toThrow("not been verified");
    expect(sent).toEqual(["/auth/me"]);
    expect(useAuthStore.getState().user).toBeNull();
  });
  test("storage clear signs out, while unrelated storage events leave the identity alone", async () => {
    useAuthStore.getState().login("token-a", pm);
    seedPrivateState();
    browser.emitStorage("nodewave_theme");
    expect(getSessionIdentity().token).toBe("token-a");
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    localStorage.clear();
    browser.emitStorage(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(getSessionIdentity().token).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

test("logout accepts 204 with an undefined body without a false revocation warning", async () => {
  useAuthStore.getState().login("token-a", pm);
  api.defaults.adapter = async (config) => response(config, undefined, 204);
  await useAuthStore.getState().logout();
  expect(useAuthStore.getState().logoutWarning).toBeNull();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});
