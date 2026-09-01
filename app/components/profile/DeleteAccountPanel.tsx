"use client";

import axios from "axios";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { AlertTriangle, LockKeyhole, MailCheck, Trash2, X } from "lucide-react";

function apiError(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.error || "The request could not be completed"
    : "The request could not be completed";
}

export default function DeleteAccountPanel() {
  const [expanded, setExpanded] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const requestCode = async () => {
    setRequesting(true);
    setError("");
    try {
      const response = await axios.post("/api/profile/delete-account");
      setCodeRequested(true);
      setPreviewCode(response.data.previewCode || "");
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setRequesting(false);
    }
  };

  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleting(true);
    setError("");
    try {
      await axios.delete("/api/profile/delete-account", { data: { code, confirmation } });
      await signOut({ callbackUrl: "/?accountDeleted=1" });
    } catch (deleteError) {
      setError(apiError(deleteError));
      setDeleting(false);
    }
  };

  const close = () => {
    if (requesting || deleting) return;
    setExpanded(false);
    setCodeRequested(false);
    setCode("");
    setConfirmation("");
    setPreviewCode("");
    setError("");
  };

  return (
    <section id="danger-zone" className="scroll-mt-32 overflow-hidden rounded-md border border-error/25 bg-white">
      <div className="flex items-start justify-between gap-5 p-5 sm:p-6">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
            <Trash2 size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Delete account</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
              Permanently remove your Redrive profile and app-controlled personal information. This cannot be undone.
            </p>
          </div>
        </div>
        {!expanded && (
          <button type="button" onClick={() => setExpanded(true)} className="shrink-0 rounded-sm border border-error px-4 py-2 text-sm font-semibold text-error outline-none transition hover:bg-error/5 focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2">
            Review deletion
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-error/20 bg-error/[0.035] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-error" size={20} aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Understand what will happen</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-body">
                  <li>Your profile, licence files, listings, reviews, messages, saved searches, notifications, and managed images will be removed.</li>
                  <li>Active trips, booking requests, unsettled payments, and open incidents must be resolved first.</li>
                  <li>Your connected payout account will be closed where Stripe permits it. Payment providers may retain limited transaction records required by law.</li>
                  <li>You cannot restore the account, its history, or its conversations after deletion.</li>
                </ul>
              </div>
            </div>
            <button type="button" onClick={close} aria-label="Close account deletion panel" className="rounded-full p-2 text-muted outline-none hover:bg-white hover:text-ink focus-visible:ring-2 focus-visible:ring-primary">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {!codeRequested ? (
            <div className="mt-6 rounded-md border border-hairline-soft bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="flex gap-3">
                <MailCheck className="mt-0.5 shrink-0 text-primary" size={19} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-ink">Verify this request by email</p>
                  <p className="mt-1 text-xs leading-5 text-muted">We will send a six-digit code to your sign-in email. The code expires after 10 minutes.</p>
                </div>
              </div>
              <button type="button" disabled={requesting} onClick={() => void requestCode()} className="mt-4 inline-flex h-11 w-full shrink-0 items-center justify-center rounded-sm bg-error px-5 text-sm font-semibold text-ink outline-none transition hover:bg-error-hover disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 sm:mt-0 sm:w-auto">
                {requesting ? "Sending code…" : "Send deletion code"}
              </button>
            </div>
          ) : (
            <form onSubmit={deleteAccount} className="mt-6 rounded-md border border-error/25 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <LockKeyhole size={18} className="text-error" aria-hidden="true" />
                Final confirmation
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted">
                  Six-digit email code
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="mt-2 h-12 w-full rounded-sm border border-hairline px-4 text-center text-lg font-semibold tracking-[0.3em] text-ink outline-none focus:border-error focus:ring-2 focus:ring-error/15"
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Type DELETE to confirm
                  <input
                    required
                    autoComplete="off"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="DELETE"
                    className="mt-2 h-12 w-full rounded-sm border border-hairline px-4 text-sm font-semibold text-ink outline-none focus:border-error focus:ring-2 focus:ring-error/15"
                  />
                </label>
              </div>
              {previewCode && <p className="mt-4 rounded-sm bg-accent-soft px-3 py-2 text-xs text-ink">Development preview code: <strong>{previewCode}</strong></p>}
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" disabled={requesting || deleting} onClick={() => void requestCode()} className="text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink disabled:opacity-50">
                  {requesting ? "Sending…" : "Send a new code"}
                </button>
                <button type="submit" disabled={deleting || code.length !== 6 || confirmation !== "DELETE"} className="inline-flex h-11 items-center justify-center rounded-sm bg-error px-5 text-sm font-semibold text-ink outline-none transition hover:bg-error-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2">
                  {deleting ? "Permanently deleting…" : "Permanently delete account"}
                </button>
              </div>
            </form>
          )}

          {error && <p role="alert" className="mt-4 rounded-sm border border-error/20 bg-white px-4 py-3 text-sm leading-6 text-error">{error}</p>}
        </div>
      )}
    </section>
  );
}
