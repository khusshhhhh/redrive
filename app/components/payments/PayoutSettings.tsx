"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { BadgeCheck, Building2, ExternalLink, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

type PayoutStatus = {
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
};

export default function PayoutSettings() {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const refresh = () => {
    setLoading(true);
    axios
      .get<PayoutStatus>("/api/payments/connect")
      .then((response) => setStatus(response.data))
      .catch((error) =>
        toast.error(
          error.response?.data?.error || "Payout status could not be loaded",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const startOnboarding = async () => {
    setRedirecting(true);
    try {
      const response = await axios.post<{ url: string }>(
        "/api/payments/connect",
      );
      window.location.assign(response.data.url);
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Payout setup could not be started",
      );
      setRedirecting(false);
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
      ) : (
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
                    ? "Your BSB and account details are held by Stripe. Redrive only stores your payout account status."
                    : "Complete Stripe’s secure identity and Australian bank account onboarding before approving a booking."}
                </p>
              </div>
            </div>
            {!status?.payoutsEnabled && (
              <button
                type="button"
                disabled={redirecting}
                onClick={() => void startOnboarding()}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-active disabled:opacity-50"
              >
                {redirecting
                  ? "Opening Stripe…"
                  : status?.connected
                    ? "Continue setup"
                    : "Set up payouts"}
                <ExternalLink size={15} />
              </button>
            )}
          </div>
          <p className="mt-4 border-t border-hairline-soft pt-4 text-[11px] leading-5 text-muted">
            For your security, never send bank details through Redrive messages
            or handover notes.
          </p>
        </div>
      )}
    </section>
  );
}
