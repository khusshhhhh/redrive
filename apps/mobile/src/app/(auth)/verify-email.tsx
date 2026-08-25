import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { Field, Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { apiRequest } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; previewCode?: string }>();
  const [code, setCode] = useState(params.previewCode || "");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  async function verify() {
    setLoading(true); setError(undefined);
    try { await apiRequest("/auth/verify-email", { method: "POST", body: { email: params.email, code }, authenticated: false, allowRefresh: false }); router.replace({ pathname: "/(auth)/login", params: { email: params.email } }); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "The code could not be verified."); }
    finally { setLoading(false); }
  }
  async function resend() {
    setError(undefined); setMessage(undefined);
    try { const result = await apiRequest<{ previewCode?: string }>("/auth/resend-verification", { method: "POST", body: { email: params.email }, authenticated: false, allowRefresh: false }); if (result.previewCode) setCode(result.previewCode); setMessage("A new code has been sent if the account still needs verification."); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "A new code could not be sent."); }
  }
  return <Screen contentStyle={{ paddingTop: 100 }}><Heading detail={`Enter the code sent to ${params.email}.`}>Verify your email</Heading>{params.previewCode ? <Notice tone="info">Local preview code: {params.previewCode}</Notice> : null}{message ? <Notice tone="success">{message}</Notice> : null}{error ? <Notice>{error}</Notice> : null}<Field label="Verification code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" /><PrimaryButton title="Verify email" onPress={() => void verify()} loading={loading} disabled={code.length !== 6} /><PrimaryButton title="Send another code" tone="neutral" onPress={() => void resend()} /></Screen>;
}
