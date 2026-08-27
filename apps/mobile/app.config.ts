import type { ConfigContext, ExpoConfig } from "expo/config";

const supportedVariants = ["development", "preview", "production"] as const;
type AppVariant = (typeof supportedVariants)[number];

function appVariant(): AppVariant {
  const value = process.env.EXPO_PUBLIC_APP_ENV || "development";
  if (!supportedVariants.includes(value as AppVariant)) {
    throw new Error(`EXPO_PUBLIC_APP_ENV must be one of: ${supportedVariants.join(", ")}`);
  }
  return value as AppVariant;
}

function verifiedLinkHost() {
  const explicit = process.env.EXPO_PUBLIC_LINK_HOST?.trim();
  if (explicit && /^[A-Za-z0-9.-]+$/.test(explicit) && !explicit.includes("localhost")) return explicit;
  const origin = process.env.EXPO_PUBLIC_API_ORIGIN;
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" ? url.hostname : undefined;
  } catch {
    return undefined;
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = appVariant();
  const production = variant === "production";
  const suffix = production ? "" : `.${variant}`;
  const linkHost = verifiedLinkHost();
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();

  return {
    ...config,
    name: production ? "Redrive" : `Redrive ${variant[0].toUpperCase()}${variant.slice(1)}`,
    slug: "redrive",
    description: "Discover, book, and manage peer-to-peer vehicle hire with Redrive.",
    version: "1.0.0",
    runtimeVersion: { policy: "appVersion" },
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    scheme: production ? "redrive" : `redrive-${variant}`,
    icon: "./assets/images/icon.png",
    ios: {
      bundleIdentifier: `au.com.redrive.app${suffix}`,
      supportsTablet: false,
      ...(linkHost ? { associatedDomains: [`applinks:${linkHost}`] } : {}),
      config: { usesNonExemptEncryption: false },
      infoPlist: {
        NSCameraUsageDescription: "Redrive uses the camera only when you choose to photograph a vehicle, licence, handover, or incident.",
        NSPhotoLibraryUsageDescription: "Redrive lets you choose photos for listings, identity checks, handovers, and incidents.",
        NSLocationWhenInUseUsageDescription: "Redrive uses your location only when you choose to search for nearby vehicles.",
      },
    },
    android: {
      package: `au.com.redrive.app${suffix}`,
      blockedPermissions: ["android.permission.RECORD_AUDIO"],
      adaptiveIcon: {
        backgroundColor: "#F2F1ED",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      ...(linkHost ? {
        intentFilters: [{
          action: "VIEW",
          autoVerify: true,
          data: [{ scheme: "https", host: linkHost, pathPrefix: "/" }],
          category: ["BROWSABLE", "DEFAULT"],
        }],
      } : {}),
    },
    web: { output: "static", favicon: "./assets/images/favicon.png" },
    plugins: [
      "expo-router",
      ["expo-secure-store", { configureAndroidBackup: true }],
      "expo-notifications",
      ["expo-splash-screen", { backgroundColor: "#F2F1ED", image: "./assets/images/splash-icon.png", imageWidth: 120, resizeMode: "contain" }],
      ["expo-image-picker", {
        photosPermission: "Allow Redrive to select photos you choose to upload.",
        cameraPermission: "Allow Redrive to take photos you choose to upload.",
      }],
    ],
    experiments: { typedRoutes: true, reactCompiler: true },
    extra: {
      appEnvironment: variant,
      apiOrigin: process.env.EXPO_PUBLIC_API_ORIGIN,
      linkHost,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
