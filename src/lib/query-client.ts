import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 10, // 10 seconds
      retry: (failureCount, error: any) => {
        // Do not retry 401, 403, 409, 422
        if (
          error?.response?.status === 401 ||
          error?.response?.status === 403 ||
          error?.response?.status === 409 ||
          error?.response?.status === 422
        ) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
