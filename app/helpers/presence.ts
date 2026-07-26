const ONLINE_THRESHOLD_MS = 45_000;

export function isOnline(lastActiveAt: string | null | undefined): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS;
}
