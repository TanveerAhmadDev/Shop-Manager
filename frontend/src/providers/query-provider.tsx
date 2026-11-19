"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create one QueryClient for this browser application.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data fresh for 1 minute.
            staleTime: 60 * 1000,

            // Keep unused cached data for 30 minutes.
            gcTime: 30 * 60 * 1000,

            // Don't refetch every time the browser gets focus.
            refetchOnWindowFocus: false,

            // Refetch when internet connection returns.
            refetchOnReconnect: true,

            // Retry a failed request once.
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
