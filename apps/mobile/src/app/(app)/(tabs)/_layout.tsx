import { Tabs } from "expo-router";

import { colors } from "@/theme/tokens";

export default function AppTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted }}>
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="favourites" options={{ title: "Favourites" }} />
      <Tabs.Screen name="trips" options={{ title: "Trips" }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
