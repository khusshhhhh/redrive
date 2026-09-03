"use client";

import { SWRConfig } from "swr";
import { swrFetcher } from "@/app/libs/fetcher";

/**
 * App-wide SWR defaults. SWR (not TanStack Query) is the fit here: it's made by
 * Vercel, ~4 KB, and its focus-revalidation + dedup + `refreshInterval` model
 * is exactly what the app's polling hooks were re-implementing by hand. The
 * heavier mutation-cache machinery TanStack adds isn't needed yet.
 *
 * These defaults are deliberately conservative so migrating a hook to `useSWR`
 * changes as little behaviour as possible:
 *  - revalidate on focus / reconnect (replaces the manual visibility listeners)
 *  - dedupe bursts within 5s (mount + focus + a realtime nudge = one request)
 *  - one quiet retry on error
 */
export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        errorRetryCount: 1,
        shouldRetryOnError: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
