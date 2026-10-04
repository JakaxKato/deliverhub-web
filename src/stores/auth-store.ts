import { create } from "zustand";
import { api } from "../lib/api";
import {
  getSessionIdentity,
  getSessionRevision,
  invalidateSession,
  isSessionIdentityCurrent,
  readStoredSessionToken,
  resetSessionData,
  subscribeSessionInvalidation,
} from "../lib/session-cache";
import type { ApiResponse, User } from "../types";
import { useConflictStore } from "./conflict-store";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeProjectId: string | null;
  logoutWarning: string | null;
  setActiveProjectId: (id: string | null) => void;
  login: (token: string, user: User) => void;
  clearSession: (expectedToken?: string | null) => void;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  syncStoredSession: () => void;
}

let pendingInitialization: {
  token: string;
  revision: number;
  promise: Promise<void>;
} | null = null;

const signedOutState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  activeProjectId: null,
  logoutWarning: null,
};

function clearStoredIdentity(expectedToken: string | null) {
  if (typeof window === "undefined" || readStoredSessionToken() !== expectedToken) return;
  try {
    localStorage.removeItem("nodewave_token");
    localStorage.removeItem("nodewave_user");
  } catch {
    // Restricted browser storage must not prevent in-memory session/cache cleanup.
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...signedOutState,
  isLoading: true,

  setActiveProjectId: (id) => {
    if (id !== get().activeProjectId) useConflictStore.getState().closeConflict();
    set({ activeProjectId: id });
  },

  login: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nodewave_token", token);
      localStorage.setItem("nodewave_user", JSON.stringify(user));
    }
    resetSessionData(token);
    set({
      ...signedOutState,
      token,
      user,
      isAuthenticated: true,
    });
  },

  clearSession: (expectedToken = get().token ?? readStoredSessionToken()) => {
    clearStoredIdentity(expectedToken);
    resetSessionData();
    set(signedOutState);
  },

  logout: async () => {
    const token = get().token;
    const revision = getSessionRevision();
    set({ isLoading: true });
    let warning: string | null = null;
    try {
      if (token) {
        const response = await api.post<ApiResponse<unknown> | undefined>(
          "/auth/logout",
          undefined,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          },
        );
        if (response.status !== 204 && response.data?.success !== true) {
          throw new Error("Session revocation was not confirmed.");
        }
      }
    } catch {
      warning =
        "You are signed out on this device, but server session revocation failed. The previous token may remain valid until it expires.";
    } finally {
      if (revision === getSessionRevision()) {
        get().clearSession(token);
        set({ logoutWarning: warning });
        if (readStoredSessionToken()) void get().initAuth();
      }
    }
  },

  initAuth: async () => {
    if (typeof window === "undefined") return;
    const token = readStoredSessionToken();
    if (!token) {
      get().clearSession(null);
      return;
    }
    if (get().isAuthenticated && get().token === token && getSessionIdentity().token === token)
      return;
    if (getSessionIdentity().token || get().user) {
      resetSessionData();
      set({ ...signedOutState, isLoading: true });
    }
    const identity = getSessionIdentity();
    if (
      pendingInitialization?.token === token &&
      pendingInitialization.revision === identity.revision
    ) {
      return pendingInitialization.promise;
    }
    set({ ...signedOutState, isLoading: true });
    const attempt = { token, revision: identity.revision, promise: Promise.resolve() };
    pendingInitialization = attempt;
    attempt.promise = (async () => {
      try {
        const response = await api.get<ApiResponse<User>>("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!isSessionIdentityCurrent(identity)) return;
        if (readStoredSessionToken() !== token) {
          invalidateSession(identity, "storage");
          return;
        }
        if (!response.data.success) throw new Error("Invalid session.");
        get().login(token, response.data.data);
      } catch {
        if (isSessionIdentityCurrent(identity)) {
          if (readStoredSessionToken() !== token) invalidateSession(identity, "storage");
          else get().clearSession(token);
        }
      } finally {
        if (pendingInitialization === attempt) pendingInitialization = null;
      }
    })();
    return attempt.promise;
  },

  syncStoredSession: () => {
    const token = readStoredSessionToken();
    const identity = getSessionIdentity();
    if (token === identity.token && !get().isLoading) return;
    if (
      pendingInitialization?.token === token &&
      pendingInitialization.revision === identity.revision
    )
      return;
    invalidateSession(identity, "storage");
  },
}));

subscribeSessionInvalidation((identity, reason) => {
  const changedStorage = readStoredSessionToken() !== identity.token;
  if (reason === "unauthorized" && !changedStorage) clearStoredIdentity(identity.token);
  const shouldVerify = reason === "storage" || changedStorage;
  useAuthStore.setState({
    ...signedOutState,
    isLoading: shouldVerify && readStoredSessionToken() !== null,
  });
  if (shouldVerify) void useAuthStore.getState().initAuth();
});

export function listenForSessionStorageChanges() {
  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === null || event.key === "nodewave_token" || event.key === "nodewave_user") {
      useAuthStore.getState().syncStoredSession();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}
