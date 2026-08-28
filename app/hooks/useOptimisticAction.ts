"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Called when the committing request throws, after the UI has rolled back. */
  onError?: (error: unknown) => void;
  /** How long a request may run before `showPending` flips true. */
  pendingDelayMs?: number;
}

interface Result<T> {
  /** The value to render: the optimistic guess while in flight, else the server value. */
  value: T;
  /** A request is in flight. */
  pending: boolean;
  /** In flight *and* slow enough (> `pendingDelayMs`) to warrant a spinner. */
  showPending: boolean;
  /** Apply `optimistic` immediately, run `commit`, roll back on failure. */
  run: (optimistic: T, commit: () => Promise<unknown>) => Promise<void>;
}

/**
 * Optimistic updates for reversible, low-stakes actions (likes, toggles,
 * reorders). The UI changes the instant the user acts; the server call happens
 * in the background; a failure rolls the UI back as if it never happened.
 *
 * Not for payments, bookings, or anything you can't safely undo.
 */
export function useOptimisticAction<T>(serverValue: T, options: Options = {}): Result<T> {
  const { onError, pendingDelayMs = 400 } = options;

  const [optimistic, setOptimistic] = useState<{ value: T } | null>(null);
  const [pending, setPending] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Once the server value catches up to (or overrides) our guess, step aside.
  useEffect(() => {
    if (optimistic && Object.is(serverValue, optimistic.value)) setOptimistic(null);
  }, [serverValue, optimistic]);

  useEffect(() => () => {
    if (slowTimer.current) clearTimeout(slowTimer.current);
  }, []);

  const run = useCallback(
    async (next: T, commit: () => Promise<unknown>) => {
      setOptimistic({ value: next });
      setPending(true);
      if (slowTimer.current) clearTimeout(slowTimer.current);
      slowTimer.current = setTimeout(() => setShowPending(true), pendingDelayMs);

      try {
        await commit();
        // Keep showing `next` — it's the truth now — until the server value
        // confirms it and the effect above clears the override.
      } catch (error) {
        setOptimistic(null); // roll back
        onError?.(error);
      } finally {
        if (slowTimer.current) clearTimeout(slowTimer.current);
        setPending(false);
        setShowPending(false);
      }
    },
    [onError, pendingDelayMs],
  );

  return {
    value: optimistic ? optimistic.value : serverValue,
    pending,
    showPending,
    run,
  };
}
