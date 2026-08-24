import Constants from "expo-constants";
import { Platform } from "react-native";

import { mobileApiUrl } from "./config";
import { ApiError, toApiError } from "./errors";

type SessionAdapter = {
  refresh: () => Promise<boolean>;
  onUnauthenticated: () => Promise<void> | void;
};

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
  authenticated?: boolean;
  allowRefresh?: boolean;
  idempotencyKey?: string;
};

let accessToken: string | null = null;
let sessionAdapter: SessionAdapter | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function configureSessionAdapter(adapter: SessionAdapter | null) {
  sessionAdapter = adapter;
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() || `app-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function sharedRefresh() {
  if (!sessionAdapter) return false;
  refreshPromise ??= sessionAdapter.refresh().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function abortAfter(timeoutMs: number, external?: AbortSignal | null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);
  const onAbort = () => controller.abort(external?.reason);
  external?.addEventListener("abort", onAbort, { once: true });
  return { signal: controller.signal, dispose: () => { clearTimeout(timer); external?.removeEventListener("abort", onAbort); } };
}

async function fetchOnce<T>(path: string, options: ApiRequestOptions, retryAfterRefresh: boolean): Promise<T> {
  const {
    body: requestBody,
    timeoutMs = 15_000,
    authenticated = true,
    allowRefresh = true,
    idempotencyKey,
    ...requestInit
  } = options;
  const id = requestId();
  const headers = new Headers(requestInit.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Request-Id", id);
  headers.set("X-Redrive-App-Version", Constants.expoConfig?.version || "unknown");
  headers.set("X-Redrive-Platform", Platform.OS);
  if (authenticated && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

  let body: BodyInit | undefined;
  if (requestBody !== undefined) {
    if (requestBody instanceof FormData) body = requestBody;
    else {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(requestBody);
    }
  }

  const timeout = abortAfter(timeoutMs, requestInit.signal);
  try {
    const response = await fetch(mobileApiUrl(path), { ...requestInit, body, headers, signal: timeout.signal });
    if (response.status === 401 && authenticated && allowRefresh && !retryAfterRefresh) {
      if (await sharedRefresh()) return fetchOnce<T>(path, options, true);
      await sessionAdapter?.onUnauthenticated();
    }
    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) throw toApiError(response.status, payload, response.headers.get("x-request-id") || id);
    return payload as T;
  } finally {
    timeout.dispose();
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const safeToRetry = ["GET", "HEAD"].includes(method);
  const attempts = safeToRetry ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchOnce<T>(path, options, false);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && error.status < 500) throw error;
      if (attempt === attempts - 1) throw error;
      const delay = Math.min(1500, 200 * 2 ** attempt) + Math.floor(Math.random() * 150);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export function newIdempotencyKey(scope: string) {
  return `${scope}:${requestId()}`;
}
