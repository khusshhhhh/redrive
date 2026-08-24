import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { Field, Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { useSession } from "@/providers/session-provider";
import { ApiError } from "@/services/api/errors";

export default function VerifyLoginOtpScreen() {
  const { challengeId, returnTo, previewCode } = useLocalSearchParams<{ challengeId: string; returnTo?: string; previewCode?: string }>();
  const router = useRouter();
  const { verifyLoginOtp } = useSession();
  const [code, setCode] = useState(previewCode || "");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true); setError(undefined);
    try {
      await verifyLoginOtp(challengeId, code);
      router.replace(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo as Href : "/(app)/(tabs)/explore");
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "The code could not be verified."); }
    finally { setLoading(false); }
  }
  return <Screen contentStyle={{ paddingTop: 100 }}><Heading detail="Enter the six-digit code sent to your email.">Confirm sign-in</Heading>{previewCode ? <Notice tone="info">Local preview code: {previewCode}</Notice> : null}{error ? <Notice>{error}</Notice> : null}<Field label="Verification code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" /><PrimaryButton title="Verify and sign in" onPress={() => void submit()} loading={loading} disabled={code.length !== 6} /></Screen>;
}
