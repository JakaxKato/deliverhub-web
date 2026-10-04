import axios, { CanceledError } from "axios";
import {
  assertSessionIdentity,
  getSessionIdentity,
  invalidateSession,
  isSessionIdentityCurrent,
  readStoredSessionToken,
  type SessionIdentity,
} from "./session-cache";

declare module "axios" {
  interface AxiosRequestConfig {
    nodewaveSession?: SessionIdentity;
  }
}

const baseURL = `${process.env.NEXT_PUBLIC_BE_URL || "http://localhost:4000"}/api`;

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/** Extracts the API error message from an Axios-shaped error object. */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (typeof error === "object" && error !== null) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message;
    if (message) return message;
  }
  return fallback;
}

api.interceptors.request.use(
  (config) => {
    const identity = getSessionIdentity();
    config.nodewaveSession = identity;
    if (!config.url?.startsWith("/auth/")) {
      assertSessionIdentity(identity);
      // Storage is only a change detector, never the source of request credentials.
      if (typeof window !== "undefined" && readStoredSessionToken() !== identity.token) {
        invalidateSession(identity, "storage");
        throw new CanceledError("Session changed. Waiting for verification.");
      }
      const authorization = `Bearer ${identity.token}`;
      if (config.headers.Authorization && config.headers.Authorization !== authorization) {
        throw new CanceledError("Request credentials do not match the verified session.");
      }
      config.headers.Authorization = authorization;
    }
    return config;
  },
  (error) => {
    throw error;
  },
  // Capture before Axios yields: an already-started request must never acquire a new identity.
  { synchronous: true },
);

api.interceptors.response.use(
  (response) => {
    const identity = response.config.nodewaveSession;
    if (identity && !isSessionIdentityCurrent(identity)) {
      throw new CanceledError("Session changed.");
    }
    if (
      identity &&
      !response.config.url?.startsWith("/auth/") &&
      typeof window !== "undefined" &&
      readStoredSessionToken() !== identity.token
    ) {
      invalidateSession(identity, "storage");
      throw new CanceledError("Session changed.");
    }
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      const identity = error.config?.nodewaveSession;
      if (identity && !isSessionIdentityCurrent(identity)) {
        return Promise.reject(new CanceledError("Session changed."));
      }
      if (error.response?.status === 401 && identity && !error.config?.url?.startsWith("/auth/")) {
        const changedStorage =
          typeof window !== "undefined" && readStoredSessionToken() !== identity.token;
        invalidateSession(identity, changedStorage ? "storage" : "unauthorized");
      }
    }
    return Promise.reject(error);
  },
);
