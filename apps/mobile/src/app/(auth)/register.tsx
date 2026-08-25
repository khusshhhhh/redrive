import type { RegisterRequest } from "@redrive/contracts/mobile";
import { useRouter } from "expo-router";
import { useState } from "react";

import { Field, Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { apiRequest } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";

type Form = Omit<RegisterRequest, "hobbies" | "dreamDestinations">;
const initial: Form = { email: "", password: "", name: "", number: "", dateOfBirth: "", streetAddress: "", suburb: "", state: "SA", postcode: "" };

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const update = (key: keyof Form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit() {
    setLoading(true); setError(undefined);
    try {
      const result = await apiRequest<{ email: string; previewCode?: string }>("/auth/register", { method: "POST", body: { ...form, hobbies: [], dreamDestinations: [] }, authenticated: false, allowRefresh: false });
      router.replace({ pathname: "/(auth)/verify-email", params: { email: result.email, ...(result.previewCode ? { previewCode: result.previewCode } : {}) } });
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Your account could not be created."); }
    finally { setLoading(false); }
  }
  return <Screen contentStyle={{ paddingTop: 80 }}><Heading detail="All fields are required for safe vehicle hire. You must be at least 18.">Create your account</Heading>{error ? <Notice>{error}</Notice> : null}<Field label="Full name" value={form.name} onChangeText={update("name")} autoCapitalize="words" autoComplete="name" /><Field label="Email" value={form.email} onChangeText={update("email")} keyboardType="email-address" autoComplete="email" /><Field label="Australian mobile" value={form.number} onChangeText={update("number")} keyboardType="phone-pad" autoComplete="tel" /><Field label="Date of birth (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={update("dateOfBirth")} /><Field label="Street address" value={form.streetAddress} onChangeText={update("streetAddress")} autoCapitalize="words" /><Field label="Suburb" value={form.suburb} onChangeText={update("suburb")} autoCapitalize="words" /><Field label="State" value={form.state} onChangeText={update("state")} autoCapitalize="characters" /><Field label="Postcode" value={form.postcode} onChangeText={update("postcode")} keyboardType="number-pad" /><Field label="Password" value={form.password} onChangeText={update("password")} secureTextEntry autoComplete="new-password" /><Notice tone="info">Use at least 8 characters with uppercase, lowercase, a number, and a symbol.</Notice><PrimaryButton title="Create account" onPress={() => void submit()} loading={loading} /></Screen>;
}
