import { create } from "zustand";
import { api } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeProjectId: string | null;
  seededUsers: User[];
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
  fetchSeededUsers: () => Promise<void>;
  quickSwitch: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  activeProjectId: null,
  seededUsers: [],

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),

  login: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nodewave_token", token);
      localStorage.setItem("nodewave_user", JSON.stringify(user));
    }
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nodewave_token");
      localStorage.removeItem("nodewave_user");
    }
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeProjectId: null,
    });
  },

  initAuth: async () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("nodewave_token");
    const userStr = localStorage.getItem("nodewave_user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });

        // Verify token freshness with /api/auth/me
        const res = await api.get("/auth/me");
        if (res.data.success) {
          set({ user: res.data.data, isLoading: false });
        }
      } catch (err) {
        console.error("Session expired or invalid:", err);
        localStorage.removeItem("nodewave_token");
        localStorage.removeItem("nodewave_user");
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }

    // Also fetch seeded users for quick role switcher
    get().fetchSeededUsers();
  },

  fetchSeededUsers: async () => {
    try {
      const res = await api.get("/auth/seeded-users");
      if (res.data.success) {
        set({ seededUsers: res.data.data });
      }
    } catch (err) {
      console.error("Failed to load seeded users:", err);
    }
  },

  quickSwitch: async (email: string) => {
    try {
      set({ isLoading: true });
      const res = await api.post("/auth/quick-login", { email });
      if (res.data.success) {
        const { token, user } = res.data.data;
        get().login(token, user);
      }
    } catch (err) {
      console.error("Quick switch failed:", err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
