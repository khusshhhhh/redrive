import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, radii, spacing } from "@/theme/tokens";

export function Heading({ children, detail }: { children: ReactNode; detail?: ReactNode }) {
  return <View style={styles.heading}><Text style={styles.title}>{children}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#8F877F" style={[styles.input, error ? styles.inputError : null]} autoCapitalize="none" {...props} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

export function PrimaryButton({ title, onPress, loading, disabled, tone = "primary" }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; tone?: "primary" | "danger" | "neutral" }) {
  const backgroundColor = tone === "danger" ? colors.danger : tone === "neutral" ? colors.surface : colors.primary;
  const textColor = tone === "neutral" ? colors.ink : "#FFFFFF";
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor, borderColor: tone === "neutral" ? colors.border : backgroundColor }, pressed && styles.pressed, (disabled || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>}</Pressable>;
}

export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const color = tone === "success" ? colors.success : tone === "info" ? colors.primary : colors.danger;
  return <View style={[styles.notice, { borderColor: color }]}><Text style={[styles.noticeText, { color }]}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm, marginBottom: spacing.sm }, title: { color: colors.ink, fontSize: 30, fontWeight: "800" }, detail: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  field: { gap: spacing.xs }, label: { color: colors.ink, fontSize: 14, fontWeight: "700" }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 14, fontSize: 16 }, inputError: { borderColor: colors.danger }, error: { color: colors.danger, fontSize: 13 },
  button: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md }, buttonText: { fontSize: 16, fontWeight: "800" }, pressed: { opacity: 0.82 }, disabled: { opacity: 0.5 },
  notice: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.surface }, noticeText: { fontSize: 14, lineHeight: 20 },
});
