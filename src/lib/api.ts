import axios from "axios";

const baseURL = `${process.env.NEXT_PUBLIC_BE_URL || "http://localhost:4000"}/api`;

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("nodewave_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        localStorage.removeItem("nodewave_token");
        localStorage.removeItem("nodewave_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
