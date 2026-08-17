"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }); const data = await response.json(); setMessage(response.ok ? "Password changed. You can now sign in." : data.error || "Unable to reset password."); setLoading(false); }
  return <main className="mx-auto min-h-[70vh] max-w-md px-6 py-28"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Secure recovery</p><h1 className="mt-2 text-3xl font-semibold text-ink">Choose a new password</h1><p className="mt-3 text-sm leading-6 text-muted">Use at least eight characters with uppercase, lowercase, a number and a symbol.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-semibold text-ink" htmlFor="password">New password</label><input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 w-full rounded-sm border border-hairline px-4 outline-none focus:border-primary"/><button disabled={loading || !token} className="h-12 w-full rounded-sm bg-primary font-semibold text-white disabled:opacity-50">{loading ? "Updating…" : "Update password"}</button></form>{message && <p role="status" className="mt-5 rounded-sm bg-surface-soft p-4 text-sm text-ink">{message}</p>}</main>;
}
