import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

import { notificationDestination } from "@/services/notifications/notification-links";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

function destination(data: unknown) {
  const environment = Constants.expoConfig?.extra?.appEnvironment;
  const verifiedHost = Constants.expoConfig?.extra?.linkHost;
  return notificationDestination(data, {
    appScheme: environment === "production" ? "redrive" : `redrive-${environment || "development"}`,
    verifiedHost: typeof verifiedHost === "string" ? verifiedHost : undefined,
  });
}

export function NotificationNavigation() {
  useEffect(() => {
    let active = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active && response) router.push(destination(response.notification.request.content.data) as never);
    }).catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      router.push(destination(response.notification.request.content.data) as never);
    });
    return () => { active = false; subscription.remove(); };
  }, []);
  return null;
}
