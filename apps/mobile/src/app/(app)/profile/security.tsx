import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Field, Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { useSession } from "@/providers/session-provider";
import { apiRequest } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";
import { colors, radii, spacing } from "@/theme/tokens";

type DeviceSession = { id: string; current: boolean; deviceName: string | null; platform: string; appVersion: string | null; lastSeenAt: string; expiresAt: string };
type SecurityState = { loginOtpEnabled: boolean; passwordChangedAt: string | null; sessions: DeviceSession[] };

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "That security change could not be completed.";
}

export default function SecurityScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearLocalSession } = useSession();
  const query = useQuery({ queryKey: ["account-security"], queryFn: () => apiRequest<SecurityState>("/me/security") });
  const [otpPassword, setOtpPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const otpMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest<{ loginOtpEnabled: boolean }>("/me/security", { method: "PATCH", body: { loginOtpEnabled: enabled, currentPassword: otpPassword } }),
    onSuccess: async (result) => { setOtpPassword(""); setError(undefined); setMessage(result.loginOtpEnabled ? "Email login verification is now enabled." : "Email login verification is now disabled."); await queryClient.invalidateQueries({ queryKey: ["account-security"] }); },
    onError: (caught) => setError(errorMessage(caught)),
  });
  const passwordMutation = useMutation({
    mutationFn: () => apiRequest<{ changed: boolean; signedOut: boolean }>("/me/security", { method: "PUT", body: { currentPassword, newPassword } }),
    onSuccess: async () => { await clearLocalSession(); router.replace({ pathname: "/(auth)/login", params: { reason: "password-changed" } }); },
    onError: (caught) => setError(errorMessage(caught)),
  });
  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => apiRequest<{ revoked: number; current: boolean }>("/me/security", { method: "DELETE", body: { sessionId } }),
    onSuccess: async (result) => { if (result.current) { await clearLocalSession(); router.replace("/(auth)/login"); return; } setMessage("That device has been signed out."); await queryClient.invalidateQueries({ queryKey: ["account-security"] }); },
    onError: (caught) => setError(errorMessage(caught)),
  });

  if (query.isPending) return <Screen><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (query.isError || !query.data) return <Screen><Notice>Security settings could not be loaded.</Notice><PrimaryButton title="Try again" onPress={() => void query.refetch()} /></Screen>;

  const state = query.data;
  const passwordMismatch = Boolean(confirmPassword && newPassword !== confirmPassword);
  return <Screen><Heading detail="Sensitive changes require your current password. Password changes revoke every web and mobile session.">Security</Heading>{message ? <Notice tone="success">{message}</Notice> : null}{error ? <Notice>{error}</Notice> : null}<View style={styles.card}><View style={styles.switchRow}><View style={styles.flex}><Text style={styles.cardTitle}>Email login verification</Text><Text style={styles.copy}>Require a six-digit email code after your password.</Text></View><Switch accessibilityLabel="Email login verification" value={state.loginOtpEnabled} disabled={otpMutation.isPending} onValueChange={(enabled) => { setMessage(undefined); setError(undefined); if (!otpPassword) { setError("Enter your current password before changing login verification."); return; } otpMutation.mutate(enabled); }} trackColor={{ false: colors.border, true: colors.primary }} /></View><Field label="Current password for this setting" value={otpPassword} onChangeText={setOtpPassword} secureTextEntry autoComplete="current-password" /></View><View style={styles.card}><Text style={styles.cardTitle}>Change password</Text><Text style={styles.copy}>Use at least eight characters with uppercase, lowercase, a number, and a symbol.</Text><Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" /><Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" /><Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" error={passwordMismatch ? "Passwords do not match." : undefined} /><PrimaryButton title="Change password and sign out" tone="danger" loading={passwordMutation.isPending} disabled={!currentPassword || !newPassword || !confirmPassword || passwordMismatch} onPress={() => { setMessage(undefined); setError(undefined); passwordMutation.mutate(); }} /></View><View style={styles.section}><Text style={styles.sectionTitle}>Signed-in devices</Text><Text style={styles.copy}>Revoke a device you do not recognise. Your current device is labelled.</Text>{state.sessions.map((session) => <View key={session.id} style={styles.session}><View style={styles.flex}><Text style={styles.sessionTitle}>{session.deviceName || `${session.platform} device`}{session.current ? " · This device" : ""}</Text><Text style={styles.sessionMeta}>Last used {new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.lastSeenAt))}{session.appVersion ? ` · App ${session.appVersion}` : ""}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Sign out ${session.deviceName || session.platform}`} disabled={revokeMutation.isPending} onPress={() => revokeMutation.mutate(session.id)} style={({ pressed }) => [styles.revoke, pressed && styles.pressed]}><Text style={styles.revokeText}>Sign out</Text></Pressable></View>)}</View></Screen>;
}

const styles = StyleSheet.create({ card: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, gap: spacing.md }, cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" }, copy: { color: colors.muted, lineHeight: 20 }, switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md }, flex: { flex: 1 }, section: { gap: spacing.sm }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" }, session: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md }, sessionTitle: { color: colors.ink, fontWeight: "800" }, sessionMeta: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 }, revoke: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm }, revokeText: { color: colors.danger, fontWeight: "800" }, pressed: { opacity: 0.6 } });
