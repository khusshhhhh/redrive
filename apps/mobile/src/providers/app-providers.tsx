import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

import { SessionProvider } from "./session-provider";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnReconnect: true },
      mutations: { retry: false },
    },
  }));
  return <QueryClientProvider client={queryClient}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
}
