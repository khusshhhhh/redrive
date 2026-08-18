"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BadgeCheck,
  Building2,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

type PayoutStatus = {
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  bankAccount: {
    bankName: string | null;
    last4: string;
  } | null;
};

type StripeAction = "onboard" | "manage";

export default function PayoutSettings() {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [opening, setOpening] = useState<StripeAction | null>(null);

  const refresh = () => {
    setLoading(true);
    setLoadError(false);
    axios
      .get<PayoutStatus>("/api/payments/connect")
      .then((response) => setStatus(response.data))
      .catch((error) => {
        setLoadError(true);
        toast.error(
          error.response?.data?.error || "Payout status could not be loaded",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const openStripe = async (action: StripeAction) => {
    setOpening(action);
    try {
      const response = await axios.post<{ url: string }>(
        "/api/payments/connect",
        { action },
      );
      window.location.assign(response.data.url);
    } catch (error: unknown) {
      const responseMessage = axios.isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error
        : undefined;
      toast.error(
        responseMessage ||
          (action === "manage"
            ? "Bank details could not be opened"
            : "Payout setup could not be started"),
      );
      setOpening(null);
    }
  };

  return (
    <section
      id="payouts"
      className="scroll-mt-32 rounded-md border border-hairline-soft bg-white p-5 sm:p-8"
    >
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink">
          <Building2 size={19} />
        </div>
        <div>
          <h2 className="text-display-sm font-semibold text-ink">
            Host payouts
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Receive earnings securely after both parties complete the return
            handover.
          </p>
        </div>
      </div>
      {loading ? (
        <div className="skeleton-wave h-28 rounded-md" />
      ) : loadError ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-hairline-soft bg-surface-soft p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-ink">
              Payout status is unavailable
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Your saved payout account has not been changed.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-hairline bg-white px-4 text-sm font-semibold text-ink hover:bg-surface-soft"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-hairline-soft p-5">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${status?.payoutsEnabled ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}
                >
                  {status?.payoutsEnabled ? (
                    <BadgeCheck size={19} />
                  ) : (
                    <ShieldCheck size={19} />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {status?.payoutsEnabled
                      ? "Payout account ready"
                      : status?.detailsSubmitted
                        ? "Stripe is verifying your details"
                        : "Payout setup required"}
                  </p>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-muted">
                    {status?.payoutsEnabled
                      ? "Your bank details have been submitted securely and can be changed at any time."
                      : "Complete Stripe’s secure identity and Australian bank account onboarding before approving a booking."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={Boolean(opening)}
                onClick={() =>
                  void openStripe(status?.payoutsEnabled ? "manage" : "onboard")
                }
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-active disabled:opacity-50"
              >
                {opening
                  ? "Opening Stripe…"
                  : status?.payoutsEnabled
                    ? "Change bank details"
                    : status?.connected
                      ? "Continue bank setup"
                      : "Add bank details"}
                <ExternalLink size={15} />
              </button>
            </div>
            {status?.bankAccount && (
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-hairline-soft pt-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Submitted payout account
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {status.bankAccount.bankName || "Australian bank account"}
                    {" •••• "}
                    {status.bankAccount.last4}
                  </p>
                </div>
                <BadgeCheck size={18} className="shrink-0 text-secondary" />
              </div>
            )}
            <p className="mt-4 border-t border-hairline-soft pt-4 text-[11px] leading-5 text-muted">
              Stripe securely holds the account holder name, BSB and account
              number. Redrive stores only your payout readiness and the masked
              account summary shown here.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [
                "1",
                "Submit securely",
                "Add the account holder, BSB and account number in Stripe.",
              ],
              [
                "2",
                "Complete checks",
                "Finish any identity or business verification Stripe requests.",
              ],
              [
                "3",
                "Update anytime",
                "Use Change bank details whenever your payout account changes.",
              ],
            ].map(([number, title, copy]) => (
              <div key={number} className="rounded-md bg-surface-soft p-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-primary">
                  {number}
                </span>
                <p className="mt-3 text-xs font-semibold text-ink">{title}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted">{copy}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] leading-5 text-muted">
            For your security, never send bank details through Redrive messages
            or handover notes.
          </p>
        </div>
      )}
    </section>
  );
}
