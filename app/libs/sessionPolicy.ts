const DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES = 60;
const MIN_SESSION_IDLE_TIMEOUT_MINUTES = 15;
const MAX_SESSION_IDLE_TIMEOUT_MINUTES = 7 * 24 * 60;

export const WEB_SESSION_ABSOLUTE_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
export const WEB_SESSION_ABSOLUTE_MAX_AGE_SECONDS = WEB_SESSION_ABSOLUTE_MAX_AGE_MS / 1_000;

export function sessionIdleTimeoutMs(value = process.env.SESSION_IDLE_TIMEOUT_MINUTES) {
  if (!value?.trim()) return DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES * 60_000;
  const minutes = Number(value);
  if (
    !Number.isSafeInteger(minutes) ||
    minutes < MIN_SESSION_IDLE_TIMEOUT_MINUTES ||
    minutes > MAX_SESSION_IDLE_TIMEOUT_MINUTES
  ) {
    return DEFAULT_SESSION_IDLE_TIMEOUT_MINUTES * 60_000;
  }
  return minutes * 60_000;
}

export function sessionIsIdle(lastSeenAt: Date | number, now = Date.now(), idleTimeoutMs = sessionIdleTimeoutMs()) {
  const lastSeen = lastSeenAt instanceof Date ? lastSeenAt.getTime() : lastSeenAt;
  return !Number.isFinite(lastSeen) || now - lastSeen >= idleTimeoutMs;
}
