import { Redirect, Stack, usePathname } from "expo-router";

import { useSession } from "@/providers/session-provider";

export default function ProtectedLayout() {
  const { status } = useSession();
  const pathname = usePathname();

  if (status === "bootstrapping") return null;
  if (status === "anonymous") {
    return <Redirect href={{ pathname: "/(auth)/login", params: { returnTo: pathname } }} />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reservation/[reservationId]" options={{ title: "Trip details" }} />
      <Stack.Screen name="chat/[chatId]" options={{ title: "Conversation" }} />
      <Stack.Screen name="booking/[listingId]" options={{ title: "Request booking" }} />
      <Stack.Screen name="profile/security" options={{ title: "Security" }} />
      <Stack.Screen name="profile/notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="profile/delete-account" options={{ title: "Delete account" }} />
    </Stack>
  );
}
