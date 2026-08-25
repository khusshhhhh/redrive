import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Field, Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { useSession } from "@/providers/session-provider";
import { apiRequest } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";
import { colors, radii, spacing } from "@/theme/tokens";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, clearLocalSession } = useSession();
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function requestCode() {
    setLoading(true); setError(undefined); setMessage(undefined);
    try {
      const result = await apiRequest<{ sent: boolean; previewCode?: string }>("/me/deletion-code", { method: "POST" });
      setCodeSent(true);
      if (result.previewCode) setCode(result.previewCode);
      setMessage(`A six-digit confirmation code was sent to ${user?.email || "your email"}. It expires after 10 minutes.`);
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "A deletion code could not be sent."); }
    finally { setLoading(false); }
  }

  async function permanentlyDelete() {
    setLoading(true); setError(undefined); setMessage(undefined);
    try {
      await apiRequest<{ deleted: true }>("/me", { method: "DELETE", body: { code, confirmation } });
      await clearLocalSession();
      router.replace("/(public)");
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Your account could not be deleted."); }
    finally { setLoading(false); }
  }

  return <Screen><Heading detail="This is permanent. Review every consequence before requesting your confirmation code.">Delete account</Heading>{message ? <Notice tone="info">{message}</Notice> : null}{error ? <Notice>{error}</Notice> : null}<View style={styles.warning}><Text style={styles.warningTitle}>What deletion means</Text>{["Your profile, listings, messages, reviews, favourites, and app-controlled media are permanently removed.", "Deletion is blocked while trips, payments, payouts, or incidents remain unresolved.", "Payment providers, backups, or legally required transaction records may remain for their required retention period.", "A later signup with the same email creates a new account and restores nothing."].map((item) => <View key={item} style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.warningCopy}>{item}</Text></View>)}</View>{!codeSent ? <PrimaryButton title="Email my deletion code" tone="danger" loading={loading} onPress={() => void requestCode()} /> : <View style={styles.confirm}><Field label="Six-digit email code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} /><Field label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} /><Notice tone="info">Redrive checks for unresolved obligations again when you submit. Opening this screen or receiving a code never deletes anything.</Notice><PrimaryButton title="Permanently delete my account" tone="danger" loading={loading} disabled={!/^\d{6}$/.test(code) || confirmation !== "DELETE"} onPress={() => void permanentlyDelete()} /><PrimaryButton title="Cancel" tone="neutral" disabled={loading} onPress={() => router.back()} /></View>}<Text style={styles.support}>You can also review the public deletion explanation at the stable Redrive account-deletion page.</Text></Screen>;
}

const styles = StyleSheet.create({ warning: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.sm }, warningTitle: { color: colors.danger, fontSize: 18, fontWeight: "900" }, bulletRow: { flexDirection: "row", gap: spacing.sm }, bullet: { color: colors.danger, fontWeight: "900" }, warningCopy: { flex: 1, color: colors.ink, lineHeight: 21 }, confirm: { gap: spacing.md }, support: { color: colors.muted, fontSize: 13, lineHeight: 19 } });
