import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const QUERY_STALE_TIMES = {
  auth: 60 * 60 * 1000, // 1 hour
  files: 5 * 60 * 1000, // 5 minutes
};
