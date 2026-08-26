export const WEB_ACTIVITY_STORAGE_KEY = "redrive:web-session:last-activity";

type ActivityStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readBrowserActivity(storage: ActivityStorage) {
  const value = Number(storage.getItem(WEB_ACTIVITY_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function recordBrowserActivity(storage: ActivityStorage, now = Date.now()) {
  storage.setItem(WEB_ACTIVITY_STORAGE_KEY, String(now));
  return now;
}

export function clearBrowserActivity(storage: ActivityStorage) {
  storage.removeItem(WEB_ACTIVITY_STORAGE_KEY);
}
