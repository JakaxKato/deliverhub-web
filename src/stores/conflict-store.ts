import { create } from "zustand";
import type { Task } from "../types";

interface ConflictState {
  isOpen: boolean;
  message: string;
  clientData: Partial<Task> | null;
  latestData: Task | null;
  serverVersion: number | null;
  clientVersion: number | null;
  openConflict: (params: {
    message: string;
    clientData?: Partial<Task>;
    latestData?: Task;
    serverVersion?: number;
    clientVersion?: number;
  }) => void;
  closeConflict: () => void;
}

export const useConflictStore = create<ConflictState>((set) => ({
  isOpen: false,
  message: "",
  clientData: null,
  latestData: null,
  serverVersion: null,
  clientVersion: null,

  openConflict: ({ message, clientData, latestData, serverVersion, clientVersion }) =>
    set({
      isOpen: true,
      message,
      clientData: clientData || null,
      latestData: latestData || null,
      serverVersion: serverVersion ?? null,
      clientVersion: clientVersion ?? null,
    }),

  closeConflict: () =>
    set({
      isOpen: false,
      message: "",
      clientData: null,
      latestData: null,
      serverVersion: null,
      clientVersion: null,
    }),
}));
