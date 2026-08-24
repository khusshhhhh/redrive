import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_TOKEN_KEY = "redrive.mobile.refresh-token.v1";
const SESSION_ID_KEY = "redrive.mobile.session-id.v1";
const DEVICE_ID_KEY = "redrive.mobile.device-id.v1";
const PENDING_REVOCATION_KEY = "redrive.mobile.pending-revocation.v1";
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let webValues = new Map<string, string>();

async function getItem(key: string) {
  if (Platform.OS === "web") return webValues.get(key) ?? null;
  return SecureStore.getItemAsync(key, secureOptions);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    webValues.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, secureOptions);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    webValues.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key, secureOptions);
}

export async function readStoredSession() {
  const [refreshToken, sessionId] = await Promise.all([getItem(REFRESH_TOKEN_KEY), getItem(SESSION_ID_KEY)]);
  return refreshToken ? { refreshToken, sessionId } : null;
}

export async function storeSession(refreshToken: string, sessionId: string) {
  await Promise.all([setItem(REFRESH_TOKEN_KEY, refreshToken), setItem(SESSION_ID_KEY, sessionId)]);
}

export async function clearStoredSession() {
  await Promise.all([deleteItem(REFRESH_TOKEN_KEY), deleteItem(SESSION_ID_KEY)]);
}

export type PendingRevocation = { scope: "device" | "all"; refreshToken: string };

export async function readPendingRevocation(): Promise<PendingRevocation | null> {
  const stored = await getItem(PENDING_REVOCATION_KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<PendingRevocation>;
    return (value.scope === "device" || value.scope === "all") && typeof value.refreshToken === "string"
      ? { scope: value.scope, refreshToken: value.refreshToken }
      : null;
  } catch {
    // Backward-compatible with an early development build that stored only the token.
    return { scope: "device", refreshToken: stored };
  }
}

export async function storePendingRevocation(refreshToken: string, scope: PendingRevocation["scope"] = "device") {
  await setItem(PENDING_REVOCATION_KEY, JSON.stringify({ scope, refreshToken }));
}

export async function clearPendingRevocation() {
  await deleteItem(PENDING_REVOCATION_KEY);
}

function randomDeviceId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid || `device-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export async function getOrCreateDeviceId() {
  const existing = await getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = randomDeviceId();
  await setItem(DEVICE_ID_KEY, next);
  return next;
}

export function resetWebSessionForTests() {
  webValues = new Map();
}
