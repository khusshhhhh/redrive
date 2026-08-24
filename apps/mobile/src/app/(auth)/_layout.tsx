import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerTransparent: true, headerTitle: "", headerBackTitle: "Back" }} />;
}
