"use client";

/**
 * Caps how many toasts are on screen at once. Extra toasts wait in a queue and
 * are released as visible ones clear. Kept deliberately tiny and fail-open: if
 * anything goes wrong the worst case is a toast shows immediately.
 */
const LIMIT = 3;

let active = 0;
const pending: Array<() => void> = [];

function drain() {
  while (active < LIMIT && pending.length > 0) {
    active += 1;
    const run = pending.shift();
    run?.();
  }
}

/** Run `show` now if there's a free slot, otherwise queue it. */
export function enqueueToast(show: () => void) {
  if (active < LIMIT) {
    active += 1;
    show();
  } else {
    pending.push(show);
  }
}

/**
 * Called by the Toaster with the current count of on-screen toasts. Frees slots
 * when toasts leave and never lets `active` drift below reality.
 */
export function syncToastCount(visibleCount: number) {
  if (visibleCount < active) {
    active = visibleCount;
    drain();
  } else if (visibleCount > active) {
    active = visibleCount;
  }
}

export function queuedToastCount() {
  return pending.length;
}
