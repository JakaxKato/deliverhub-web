import { create } from "zustand";
import type { Task } from "../types";

interface ConflictState {
  isOpen: boolean;
  message: string;
  clientData: Partial<Task> | null;
  latestData: Task | null;
  openConflict: (params: {
    message: string;
    clientData?: Partial<Task>;
    latestData?: Task;
  }) => void;
  closeConflict: () => void;
}

export const useConflictStore = create<ConflictState>((set) => ({
  isOpen: false,
  message: "",
  clientData: null,
  latestData: null,

  openConflict: ({ message, clientData, latestData }) =>
    set({
      isOpen: true,
      message,
      clientData: clientData || null,
      latestData: latestData || null,
    }),

  closeConflict: () =>
    set({
      isOpen: false,
      message: "",
      clientData: null,
      latestData: null,
    }),
}));
