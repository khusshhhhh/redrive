import assert from "node:assert/strict";
import test from "node:test";

import {
  clearBrowserActivity,
  readBrowserActivity,
  recordBrowserActivity,
  WEB_ACTIVITY_STORAGE_KEY,
} from "./browserSessionActivity";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

test("a successful login replaces stale browser activity", () => {
  const storage = memoryStorage();
  storage.setItem(WEB_ACTIVITY_STORAGE_KEY, "1000");
  recordBrowserActivity(storage, 5000);
  assert.equal(readBrowserActivity(storage), 5000);
});

test("clearing browser activity removes the inactivity timestamp", () => {
  const storage = memoryStorage();
  recordBrowserActivity(storage, 5000);
  clearBrowserActivity(storage);
  assert.equal(readBrowserActivity(storage), 0);
});
