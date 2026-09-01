"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"credentials" | "otp">("credentials");
  const [previewCode, setPreviewCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") === "forbidden" ? "This account does not have administrator access." : "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await signIn("credentials", { email: email.trim().toLowerCase(), password, otp: stage === "otp" ? otp : undefined, redirect: false });
    if (result?.error?.includes("LOGIN_OTP_REQUIRED")) {
      setPreviewCode(result.error.split("LOGIN_OTP_REQUIRED:")[1] || "");
      setStage("otp"); setIsLoading(false); return;
    }
    if (!result?.ok) {
      const otpError = result?.error?.includes("LOGIN_OTP_INVALID") ? "That six-digit code is incorrect." : result?.error?.includes("LOGIN_OTP_EXPIRED") ? "That code has expired. Return and request another." : result?.error?.includes("LOGIN_OTP_LOCKED") ? "Too many attempts. Return and request another code." : "";
      setError(otpError || (result?.error === "CredentialsSignin" ? "The username or password is incorrect." : result?.error || "Sign-in could not be completed."));
      setIsLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="w-full rounded-2xl border border-hairline-soft bg-white p-6 shadow-card sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-white"><ShieldCheck size={23} /></div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Admin sign in</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{stage === "credentials" ? "Use the email and password for an authorised Redrive administrator account." : "Enter the six-digit security code sent to your email."}</p>

      {error && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {stage === "credentials" ? <><label className="mt-6 block text-sm font-semibold text-ink">Username or email
        <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className="mt-2 w-full rounded-lg border border-hairline px-4 py-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </label>
      <label className="mt-5 block text-sm font-semibold text-ink">Password
        <span className="relative mt-2 block">
          <input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-hairline px-4 py-3 pr-12 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span>
      </label></> : <div className="mt-6"><label className="block text-sm font-semibold text-ink">Security code<input inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="mt-2 w-full rounded-lg border border-hairline px-4 py-3 text-center text-xl font-semibold tracking-[.35em] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>{previewCode && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Development preview code: <strong>{previewCode}</strong></p>}<button type="button" onClick={() => { setStage("credentials"); setOtp(""); setError(""); }} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft size={14}/>Use another account</button></div>}
      <button disabled={isLoading || (stage === "otp" && otp.length !== 6)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-ink transition hover:bg-accent-active hover:text-white disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <Loader2 size={17} className="animate-spin" /> : <LockKeyhole size={17} />} {isLoading ? "Signing in…" : stage === "otp" ? "Verify and open dashboard" : "Open admin dashboard"}</button>
      <p className="mt-5 text-center text-xs leading-5 text-muted">Administrator access is checked again on every protected page.</p>
    </form>
  );
}
