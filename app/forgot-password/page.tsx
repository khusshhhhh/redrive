"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json(); setMessage(data.message || data.error || "Please try again."); setLoading(false);
  }
  return <main className="mx-auto min-h-[70vh] max-w-md px-6 py-28"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Account recovery</p><h1 className="mt-2 text-3xl font-semibold text-ink">Reset your password</h1><p className="mt-3 text-sm leading-6 text-muted">We will send a single-use link if the address belongs to a password account.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-semibold text-ink" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 w-full rounded-sm border border-hairline px-4 outline-none focus:border-primary"/><button disabled={loading} className="h-12 w-full rounded-sm bg-primary font-semibold text-white disabled:opacity-50">{loading ? "Sending…" : "Send reset link"}</button></form>{message && <p role="status" className="mt-5 rounded-sm bg-surface-soft p-4 text-sm text-ink">{message}</p>}<Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary">Back to Redrive</Link></main>;
}

