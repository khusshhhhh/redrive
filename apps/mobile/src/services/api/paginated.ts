import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";

import { apiRequest } from "./client";

export type CursorPage<T> = { data: T[]; page: { nextCursor: string | null; hasMore: boolean } };

type CursorListOptions = {
  queryKey: QueryKey;
  /** Root-relative API path, optionally already carrying query parameters. */
  path: string;
  authenticated?: boolean;
  enabled?: boolean;
  /** Poll interval in ms for surfaces that should stay near-live (e.g. chat). */
  refetchInterval?: number;
};

/**
 * Shared cursor-paginated list query. The mobile API returns
 * `{ data, page: { nextCursor, hasMore } }` for every collection and accepts a
 * `cursor` query parameter, so every list screen scrolls through all pages the
 * same way instead of stopping at the first response.
 */
export function useCursorList<T>({ queryKey, path, authenticated = true, enabled, refetchInterval }: CursorListOptions) {
  const query = useInfiniteQuery({
    queryKey,
    enabled,
    refetchInterval,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const separator = path.includes("?") ? "&" : "?";
      const url = pageParam ? `${path}${separator}cursor=${encodeURIComponent(pageParam)}` : path;
      return apiRequest<CursorPage<T>>(url, { authenticated });
    },
    getNextPageParam: (last) => (last.page.hasMore && last.page.nextCursor ? last.page.nextCursor : undefined),
  });

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    query,
    items,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}
