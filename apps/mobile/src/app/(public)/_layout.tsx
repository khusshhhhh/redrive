import { Stack } from "expo-router";

export default function PublicLayout() {
  return <Stack><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="listing/[listingId]" options={{ title: "Vehicle" }} /></Stack>;
}
