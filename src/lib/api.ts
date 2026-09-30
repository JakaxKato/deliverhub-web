import axios from "axios";

const baseURL = `${process.env.NEXT_PUBLIC_BE_URL || "http://localhost:4000"}/api`;

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
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
        // Interceptor runs outside React, so router navigation is unavailable here.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
