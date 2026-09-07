"use client";

import { useEffect, useRef, useState } from "react";
import { clientLog } from "@/app/libs/clientLog";

type SSEEventHandler<T = unknown> = (data: T) => void;

interface UseSSEOptions {
  /** Stream URL, or null/undefined to stay disconnected (e.g. while unauthenticated). */
  url: string | null | undefined;
  /** Map of SSE event name -> handler. Doesn't need to be memoized by the caller. */
  handlers: Record<string, SSEEventHandler>;
}

/**
 * Thin wrapper around the browser's native EventSource. Reconnection after a
 * dropped/closed stream is handled entirely by the browser (including
 * resuming via the `Last-Event-ID` header for servers that set an `id` on
 * their events) — no manual retry logic needed here.
 */
export function useSSE({ url, handlers }: UseSSEOptions) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!url) {
      setConnected(false);
      return;
    }

    const source = new EventSource(url);
    const eventNames = Object.keys(handlersRef.current);
    const listeners: Array<[string, (e: MessageEvent) => void]> = [];

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    eventNames.forEach((eventName) => {
      const listener = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current[eventName]?.(data);
        } catch (err) {
          clientLog.error(`Failed to parse SSE "${eventName}" event`, err);
        }
      };
      source.addEventListener(eventName, listener);
      listeners.push([eventName, listener]);
    });

    return () => {
      listeners.forEach(([eventName, listener]) => source.removeEventListener(eventName, listener));
      source.close();
      setConnected(false);
    };
  }, [url]);

  return { connected };
}
