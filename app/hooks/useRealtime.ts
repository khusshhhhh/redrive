"use client";

import { useEffect, useRef, useState } from "react";
import type PusherClient from "pusher-js";
import type { Channel } from "pusher-js";

// One shared Pusher connection for the whole tab, created lazily the first time
// a component subscribes. `pusher-js` (~35 KB gz) is code-split behind this
// dynamic import so it never lands in the bundle for visitors who don't open a
// realtime surface (or when realtime is switched off).

let pusherPromise: Promise<PusherClient> | null = null;
let connectionRefs = 0;
const channelRefs = new Map<string, number>();

async function acquireRealtime(): Promise<PusherClient> {
  connectionRefs += 1;
  if (!pusherPromise) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) {
      // The caller's .catch() runs releaseRealtime() to balance this acquire.
      return Promise.reject(new Error("Realtime keys are not configured"));
    }
    pusherPromise = import("pusher-js").then(
      ({ default: Pusher }) =>
        new Pusher(key, {
          cluster,
          authEndpoint: "/api/realtime/auth",
        }),
    );
  }
  return pusherPromise;
}

function releaseRealtime() {
  connectionRefs = Math.max(0, connectionRefs - 1);
  if (connectionRefs === 0 && pusherPromise) {
    const pending = pusherPromise;
    pusherPromise = null;
    void pending.then((client) => client.disconnect()).catch(() => undefined);
  }
}

type Handler = (data: unknown) => void;

/**
 * Subscribe to one Pusher channel while the component is mounted.
 *
 * `handlers` is a map of event name → callback and does not need to be
 * memoised — the latest version is always used without re-subscribing.
 * Pass `channelName: null` to stay disconnected (e.g. while signed out).
 *
 * `failed` is set when Pusher gives up (bad key, auth rejected, host
 * unreachable) so callers can fall back to the SSE transport.
 */
export function useRealtimeSubscription(
  channelName: string | null,
  handlers: Record<string, Handler>,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!channelName) {
      setConnected(false);
      return;
    }
    setFailed(false);

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    acquireRealtime()
      .then((client) => {
        if (cancelled) {
          releaseRealtime();
          return;
        }

        const onState = () => {
          const state = client.connection.state;
          setConnected(state === "connected");
          if (state === "failed" || state === "unavailable") setFailed(true);
          else if (state === "connected") setFailed(false);
        };
        client.connection.bind("state_change", onState);
        onState();

        const channel: Channel = client.subscribe(channelName);
        channelRefs.set(channelName, (channelRefs.get(channelName) ?? 0) + 1);

        const boundEvents = Object.keys(handlersRef.current);
        const listeners = boundEvents.map((event) => {
          const listener = (data: unknown) => handlersRef.current[event]?.(data);
          channel.bind(event, listener);
          return [event, listener] as const;
        });

        cleanup = () => {
          client.connection.unbind("state_change", onState);
          listeners.forEach(([event, listener]) => channel.unbind(event, listener));
          const remaining = (channelRefs.get(channelName) ?? 1) - 1;
          if (remaining <= 0) {
            channelRefs.delete(channelName);
            client.unsubscribe(channelName);
          } else {
            channelRefs.set(channelName, remaining);
          }
          releaseRealtime();
        };
      })
      .catch(() => {
        if (!cancelled) {
          setConnected(false);
          setFailed(true);
        }
        releaseRealtime();
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [channelName]);

  return { connected, failed };
}
