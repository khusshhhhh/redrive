"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Check, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import toast from "@/app/libs/toast";

interface EmailVerificationProps {
  email: string;
  verified: boolean;
  onVerified: () => void;
}

export default function EmailVerification({
  email,
  verified,
  onVerified,
}: EmailVerificationProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    try {
      const response = await axios.post("/api/auth/resend-verification", {
        email,
      });
      setPreviewCode(response.data.previewCode || "");
      setCode("");
      setCodeSent(true);
      setCooldown(60);
      toast.success(codeSent ? "A fresh code is on its way" : "Verification code sent");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Unable to send a verification code");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast.error("Enter the six-digit code");
      return;
    }
    setVerifying(true);
    try {
      await axios.post("/api/auth/verify-email", { email, code });
      setCodeSent(false);
      setPreviewCode("");
      onVerified();
      toast.success("Email verified — you’re booking ready");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Unable to verify your email");
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-start gap-4 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
          <Check size={19} strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-sm font-semibold">Email verified</p>
          <p className="mt-1 break-all text-xs leading-5 text-emerald-900/75">{email}</p>
          <p className="mt-2 text-xs leading-5 text-emerald-900/75">
            Your email is confirmed.
          </p>
        </div>
      </div>
    );
  }

  if (!codeSent) {
    return (
      <div className="flex flex-col gap-5 rounded-md border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
            <MailCheck size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950">Confirm this email belongs to you</p>
            <p className="mt-1 break-all text-xs leading-5 text-amber-900/75">{email}</p>
            <p className="mt-2 text-xs leading-5 text-amber-900/75">
              We’ll send a six-digit code that expires in 10 minutes.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={sending || !email}
          onClick={() => void sendCode()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-ink px-5 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <span className="loader-orbit h-4 w-4 rounded-full border-2 border-white/40 border-t-white" /> : <MailCheck size={17} />}
          {sending ? "Sending code" : "Send verification code"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-hairline bg-surface-soft p-5 sm:p-6">
      <div className="flex gap-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold text-ink">Check your inbox</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Enter the code sent to <strong className="font-semibold text-ink">{email}</strong>.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Six-digit email verification code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void verifyCode();
            }
          }}
          placeholder="000000"
          className="h-12 min-w-0 flex-1 rounded-sm border border-hairline bg-white px-4 text-center text-lg font-semibold tracking-[0.36em] text-ink outline-none transition placeholder:text-hairline focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
        <button
          type="button"
          disabled={verifying || code.length !== 6}
          onClick={() => void verifyCode()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verifying && <span className="loader-orbit h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />}
          {verifying ? "Verifying" : "Verify email"}
        </button>
      </div>
      {previewCode && (
        <p className="mt-3 rounded-sm bg-white px-3 py-2 text-xs text-muted">
          Local preview code: <strong className="text-ink">{previewCode}</strong>
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>The code expires in 10 minutes.</span>
        <button
          type="button"
          disabled={sending || cooldown > 0}
          onClick={() => void sendCode()}
          className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-soft disabled:no-underline"
        >
          <RefreshCw size={13} />
          {cooldown > 0 ? `Send again in ${cooldown}s` : "Send a new code"}
        </button>
      </div>
    </div>
  );
}
