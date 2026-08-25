import type { LoginRequest, MobileSessionResponse, MobileUser } from "@redrive/contracts/mobile";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";

import { apiRequest, configureSessionAdapter, setAccessToken } from "@/services/api/client";
import { clearPendingRevocation, clearStoredSession, getOrCreateDeviceId, readPendingRevocation, readStoredSession, storePendingRevocation, storeSession } from "@/services/auth/secure-session";

type SessionStatus = "bootstrapping" | "anonymous" | "authenticated";
type LoginResult = { authenticated: true } | { authenticated: false; challengeId: string; expiresAt: string; previewCode?: string };

type SessionContextValue = {
  status: SessionStatus;
  user: MobileUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLoginOtp: (challengeId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function deviceMetadata(): Promise<LoginRequest["device"]> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  return {
    deviceId: await getOrCreateDeviceId(),
    deviceName: Device.deviceName || undefined,
    platform,
    appVersion: Constants.expoConfig?.version,
  };
}

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>("bootstrapping");
  const [user, setUser] = useState<MobileUser | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    refreshTokenRef.current = null;
    setAccessToken(null);
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
    await clearStoredSession().catch(() => undefined);
  }, [queryClient]);

  const applySession = useCallback(async (session: MobileSessionResponse) => {
    refreshTokenRef.current = session.refreshToken;
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus("authenticated");
    await storeSession(session.refreshToken, session.sessionId);
  }, []);

  const refresh = useCallback(async () => {
    const stored = refreshTokenRef.current || (await readStoredSession())?.refreshToken;
    if (!stored) return false;
    try {
      const session = await apiRequest<MobileSessionResponse>("/auth/refresh", { method: "POST", body: { refreshToken: stored }, authenticated: false, allowRefresh: false });
      await applySession(session);
      return true;
    } catch {
      await clearSession();
      return false;
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    configureSessionAdapter({ refresh, onUnauthenticated: async () => { await clearSession(); router.replace("/(auth)/login"); } });
    return () => configureSessionAdapter(null);
  }, [clearSession, refresh]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const pendingRevocation = await readPendingRevocation().catch(() => null);
      if (pendingRevocation) {
        try {
          if (pendingRevocation.scope === "all") {
            const temporarySession = await apiRequest<MobileSessionResponse>("/auth/refresh", { method: "POST", body: { refreshToken: pendingRevocation.refreshToken }, authenticated: false, allowRefresh: false });
            await storePendingRevocation(temporarySession.refreshToken, "all");
            setAccessToken(temporarySession.accessToken);
            await apiRequest("/auth/logout-all", { method: "POST", allowRefresh: false });
            setAccessToken(null);
          } else {
            await apiRequest("/auth/logout", { method: "POST", body: { refreshToken: pendingRevocation.refreshToken }, authenticated: false, allowRefresh: false });
          }
          await clearPendingRevocation();
        } catch {
          setAccessToken(null);
          // Keep the revocation request encrypted on-device and retry next launch.
        }
      }
      const stored = await readStoredSession().catch(() => null);
      if (!active) return;
      if (!stored?.refreshToken) {
        setStatus("anonymous");
        return;
      }
      refreshTokenRef.current = stored.refreshToken;
      const restored = await refresh();
      if (restored && active) {
        try {
          const result = await apiRequest<{ user: MobileUser }>("/me");
          if (active) setUser(result.user);
        } catch {
          if (active) await clearSession();
        }
      }
    })();
    return () => { active = false; };
  }, [clearSession, refresh]);

  useEffect(() => {
    if (status !== "bootstrapping") SplashScreen.hide();
  }, [status]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await apiRequest<MobileSessionResponse | { code: "LOGIN_OTP_REQUIRED"; challengeId: string; expiresAt: string; previewCode?: string }>("/auth/login", { method: "POST", body: { email, password, device: await deviceMetadata() }, authenticated: false, allowRefresh: false });
    if ("code" in result && result.code === "LOGIN_OTP_REQUIRED") return { authenticated: false, challengeId: result.challengeId, expiresAt: result.expiresAt, previewCode: result.previewCode };
    await applySession(result as MobileSessionResponse);
    return { authenticated: true };
  }, [applySession]);

  const verifyLoginOtp = useCallback(async (challengeId: string, code: string) => {
    const session = await apiRequest<MobileSessionResponse>("/auth/login/verify-otp", { method: "POST", body: { challengeId, code }, authenticated: false, allowRefresh: false });
    await applySession(session);
  }, [applySession]);

  const logout = useCallback(async () => {
    const refreshToken = refreshTokenRef.current;
    try {
      await apiRequest("/auth/logout", { method: "POST", body: { refreshToken }, allowRefresh: false });
      await clearPendingRevocation().catch(() => undefined);
    } catch {
      if (refreshToken) await storePendingRevocation(refreshToken, "device").catch(() => undefined);
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    const refreshToken = refreshTokenRef.current;
    try {
      await apiRequest("/auth/logout-all", { method: "POST" });
      await clearPendingRevocation().catch(() => undefined);
    } catch {
      if (refreshToken) await storePendingRevocation(refreshToken, "all").catch(() => undefined);
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({ status, user, login, verifyLoginOtp, logout, logoutAll, clearLocalSession: clearSession }), [status, user, login, verifyLoginOtp, logout, logoutAll, clearSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
