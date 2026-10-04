import { CanceledError } from "axios";
import { useConflictStore } from "../stores/conflict-store";
import { queryClient } from "./query-client";

export interface SessionIdentity {
  revision: number;
  token: string | null;
}

type InvalidationReason = "unauthorized" | "storage";
type InvalidationListener = (identity: SessionIdentity, reason: InvalidationReason) => void;

let revision = 0;
let verifiedToken: string | null = null;
const listeners = new Set<InvalidationListener>();

export function getSessionRevision() {
  return revision;
}

export function getSessionIdentity(): SessionIdentity {
  return { revision, token: verifiedToken };
}

export function isSessionIdentityCurrent(identity: SessionIdentity) {
  return identity.revision === revision && identity.token === verifiedToken;
}

export function assertSessionIdentity(identity: SessionIdentity) {
  if (!identity.token || !isSessionIdentityCurrent(identity)) {
    throw new CanceledError("Session changed or has not been verified.");
  }
}

export function readStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("nodewave_token");
  } catch {
    return null;
  }
}

export function resetSessionData(token: string | null = null) {
  revision += 1;
  verifiedToken = token;
  // Clearing also cancels queries so previous-identity responses cannot refill the cache.
  queryClient.clear();
  useConflictStore.getState().closeConflict();
}

export function subscribeSessionInvalidation(listener: InvalidationListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function invalidateSession(identity: SessionIdentity, reason: InvalidationReason) {
  if (!isSessionIdentityCurrent(identity)) return false;
  resetSessionData();
  for (const listener of listeners) listener(identity, reason);
  return true;
}
