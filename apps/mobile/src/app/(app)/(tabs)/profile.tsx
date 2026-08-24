import { StyleSheet, Text, View } from "react-native";

import { Heading, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { useSession } from "@/providers/session-provider";
import { colors, radii, spacing } from "@/theme/tokens";

export default function ProfileScreen() {
  const { user, logout, logoutAll } = useSession();
  return <Screen><Heading detail="Your account and mobile sessions.">Profile</Heading><View style={styles.card}><Text style={styles.name}>{user?.name || "Redrive member"}</Text><Text style={styles.detail}>{user?.email}</Text><Text style={styles.detail}>Email {user?.emailVerified ? "verified" : "not verified"}</Text></View><PrimaryButton title="Sign out of this device" tone="neutral" onPress={() => void logout()} /><PrimaryButton title="Sign out everywhere" tone="danger" onPress={() => void logoutAll()} /><Text style={styles.note}>Profile editing, identity checks and account deletion use the secured account API and will be surfaced in their feature screens.</Text></Screen>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs }, name: { color: colors.ink, fontSize: 20, fontWeight: "800" }, detail: { color: colors.muted }, note: { color: colors.muted, lineHeight: 20 } });
