import { useState } from "react";

import { Field, Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { apiRequest } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true); setError(undefined);
    try { const result = await apiRequest<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email }, authenticated: false, allowRefresh: false }); setMessage(result.message); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "The reset request could not be sent."); }
    finally { setLoading(false); }
  }
  return <Screen contentStyle={{ paddingTop: 100 }}><Heading detail="We will email a single-use link that expires after 30 minutes.">Reset your password</Heading>{message ? <Notice tone="success">{message}</Notice> : null}{error ? <Notice>{error}</Notice> : null}<Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" /><PrimaryButton title="Send reset link" onPress={() => void submit()} loading={loading} disabled={!email} /></Screen>;
}
