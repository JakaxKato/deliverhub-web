import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 10, // 10 seconds
      retry: (failureCount, error) => {
        // Do not retry 401, 403, 409, 422
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 409 || status === 422) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
