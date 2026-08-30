import Constants from "expo-constants";

import { safeDeepLinkDestination } from "@/services/links/deep-links";

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const appEnvironment = Constants.expoConfig?.extra?.appEnvironment;
    const appScheme = appEnvironment === "production" ? "redrive" : `redrive-${appEnvironment || "development"}`;
    const verifiedHost = Constants.expoConfig?.extra?.linkHost;
    return safeDeepLinkDestination(path, {
      appScheme,
      verifiedHost: typeof verifiedHost === "string" ? verifiedHost : undefined,
    });
  } catch {
    // A thrown redirect resolver would break every incoming link; fail safe to home.
    return "/";
  }
}
