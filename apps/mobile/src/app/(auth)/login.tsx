import { Link, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Field, Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { useSession } from "@/providers/session-provider";
import { ApiError } from "@/services/api/errors";
import { colors, spacing } from "@/theme/tokens";

function safeReturnPath(value?: string): Href {
  return value?.startsWith("/") && !value.startsWith("//") ? value as Href : "/(app)/(tabs)/explore";
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true); setError(undefined);
    try {
      const result = await login(email.trim(), password);
      if (result.authenticated) router.replace(safeReturnPath(params.returnTo));
      else router.push({ pathname: "/(auth)/verify-login-otp", params: { challengeId: result.challengeId, returnTo: params.returnTo || "", ...(result.previewCode ? { previewCode: result.previewCode } : {}) } });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Sign-in could not be completed.");
    } finally { setLoading(false); }
  }

  return <Screen contentStyle={styles.content}><Heading detail="Use your verified Redrive email and password.">Welcome back</Heading>{error ? <Notice>{error}</Notice> : null}<Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" /><PrimaryButton title="Sign in" onPress={() => void submit()} loading={loading} disabled={!email || !password} /><Link href="/(auth)/forgot-password" style={styles.link}>Forgot password?</Link><Text style={styles.footer}>New to Redrive? <Link href="/(auth)/register" style={styles.link}>Create an account</Link></Text></Screen>;
}

const styles = StyleSheet.create({ content: { paddingTop: 100 }, link: { color: colors.primary, fontWeight: "800" }, footer: { color: colors.muted, marginTop: spacing.sm } });
