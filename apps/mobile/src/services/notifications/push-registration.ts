import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiRequest } from "@/services/api/client";
import { getOrCreateDeviceId } from "@/services/auth/secure-session";

export type PushRegistrationState = "granted" | "denied" | "unavailable";

function appEnvironment() {
  const value = Constants.expoConfig?.extra?.appEnvironment;
  return value === "preview" || value === "production" ? value : "development";
}

async function expoPushToken() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== "string" || !projectId) throw new Error("Push notifications require the EAS project ID in this build.");
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export async function currentPushPermission(): Promise<PushRegistrationState> {
  if (!Device.isDevice || Platform.OS === "web") return "unavailable";
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted ? "granted" : permission.canAskAgain ? "denied" : "denied";
}

export async function enablePushNotifications() {
  if (!Device.isDevice || Platform.OS === "web") throw new Error("Push notifications require an installed development or release build on a physical device.");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Redrive updates", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { enabled: false as const };
  const token = await expoPushToken();
  await apiRequest("/devices/push-tokens", { method: "POST", body: { token, deviceId: await getOrCreateDeviceId(), platform: Platform.OS, appEnvironment: appEnvironment() } });
  return { enabled: true as const };
}

export async function disablePushNotifications() {
  if (!Device.isDevice || Platform.OS === "web") return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  const token = await expoPushToken();
  await apiRequest("/devices/push-tokens", { method: "DELETE", body: { token, deviceId: await getOrCreateDeviceId(), platform: Platform.OS, appEnvironment: appEnvironment() } });
}
