import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { currentPushPermission, disablePushNotifications, enablePushNotifications, type PushRegistrationState } from "@/services/notifications/push-registration";
import { colors, radii, spacing } from "@/theme/tokens";

export default function NotificationsScreen() {
  const [permission, setPermission] = useState<PushRegistrationState>();
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => { void currentPushPermission().then(setPermission).catch(() => setPermission("unavailable")); }, []);

  async function enable() {
    setLoading(true); setError(undefined); setMessage(undefined);
    try {
      const result = await enablePushNotifications();
      setPermission(result.enabled ? "granted" : "denied");
      setRegistered(result.enabled);
      setMessage(result.enabled ? "This device is registered for Redrive notifications." : "Notification permission was not granted. You can continue using every core feature without it.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Notifications could not be enabled."); }
    finally { setLoading(false); }
  }

  async function disable() {
    setLoading(true); setError(undefined); setMessage(undefined);
    try { await disablePushNotifications(); setRegistered(false); setMessage("Redrive notifications have been disabled for this device."); }
    catch { setError("This device could not be unregistered. Try again while online."); }
    finally { setLoading(false); }
  }

  return <Screen><Heading detail="Redrive asks only when you choose to enable notifications. Notification data contains a type and opaque record ID; authorized content is fetched after you open it.">Notifications</Heading>{message ? <Notice tone="info">{message}</Notice> : null}{error ? <Notice>{error}</Notice> : null}<View style={styles.card}><Text style={styles.title}>Useful, timely updates</Text><Text style={styles.copy}>Notifications can alert you to booking requests, approvals, payment reminders, new messages, pickup reminders, reviews, and account-security events.</Text><Text style={styles.copy}>You can deny permission and keep using Redrive. Your operating-system settings remain authoritative.</Text></View>{permission === "unavailable" ? <Notice tone="info">Push notifications require a physical device running a Redrive development or release build.</Notice> : <PrimaryButton title={permission === "granted" && registered ? "Refresh device registration" : "Enable notifications on this device"} loading={loading} onPress={() => void enable()} />}{permission === "granted" ? <PrimaryButton title="Disable notifications on this device" tone="neutral" disabled={loading} onPress={() => void disable()} /> : null}</Screen>;
}

const styles = StyleSheet.create({ card: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface }, title: { color: colors.ink, fontSize: 18, fontWeight: "800" }, copy: { color: colors.muted, lineHeight: 21 } });
