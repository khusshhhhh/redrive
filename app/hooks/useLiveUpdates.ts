"use client";

import { useSSE } from "@/app/hooks/useSSE";
import { useRealtimeSubscription } from "@/app/hooks/useRealtime";
import { REALTIME_ENABLED } from "@/app/libs/realtime/events";

type Handler = (data: unknown) => void;

interface UseLiveUpdatesOptions {
  /** Ably channel to use when realtime is configured. Null = stay disconnected. */
  channel: string | null;
  /** SSE URL to fall back to when realtime is off. Null = stay disconnected. */
  sseUrl: string | null;
  /** event name → handler. The two transports emit the same event names. */
  handlers: Record<string, Handler>;
}

/**
 * Live server-push updates with one interface over two transports:
 *
 *  - When `NEXT_PUBLIC_REALTIME_ENABLED` is set, subscribes to an Ably channel.
 *  - Otherwise, opens the existing short-lived SSE polling stream.
 *
 * Both hooks are always called (rules of hooks); the unused one is handed
 * `null` and does nothing. Event payload shapes are identical across the two,
 * so the same `handlers` map works either way.
 */
export function useLiveUpdates({ channel, sseUrl, handlers }: UseLiveUpdatesOptions) {
  const wantRealtime = REALTIME_ENABLED && channel !== null;

  const realtime = useRealtimeSubscription(wantRealtime ? channel : null, handlers);

  // If Ably can't connect (missing/blocked key, auth rejected), drop back to
  // SSE rather than leaving the surface with no live updates at all.
  const useRealtime = wantRealtime && !realtime.failed;
  const sse = useSSE({ url: useRealtime ? null : sseUrl, handlers });

  return {
    connected: useRealtime ? realtime.connected : sse.connected,
    transport: useRealtime ? ("realtime" as const) : ("sse" as const),
  };
}
