import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router, useRootNavigationState } from "expo-router";
import { useEffect, useRef } from "react";

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
  const rootNavigationState = useRootNavigationState();
  const navigatorReady = Boolean(rootNavigationState?.key);
  const handledResponseIds = useRef(new Set<string>());
  const pendingDestination = useRef<string | null>(null);

  useEffect(() => {
    function handle(response: Notifications.NotificationResponse | null) {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledResponseIds.current.has(id)) return;
      handledResponseIds.current.add(id);
      const target = destination(response.notification.request.content.data);
      if (navigatorReady) router.push(target as never);
      else pendingDestination.current = target;
    }

    let active = true;
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => { if (active) handle(response); })
      .catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => { active = false; subscription.remove(); };
  }, [navigatorReady]);

  // A tap that arrived before the navigator mounted is replayed once it is ready.
  useEffect(() => {
    if (navigatorReady && pendingDestination.current) {
      const target = pendingDestination.current;
      pendingDestination.current = null;
      router.push(target as never);
    }
  }, [navigatorReady]);

  return null;
}
