import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from 'react-native';

import { AppProviders } from "@/providers/app-providers";
import { NotificationNavigation } from "@/components/notification-navigation";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProviders>
        <NotificationNavigation />
        <Stack screenOptions={{ headerBackTitle: "Back" }}>
          <Stack.Screen name="(public)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </AppProviders>
    </ThemeProvider>
  );
}
