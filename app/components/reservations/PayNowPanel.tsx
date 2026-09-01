"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { CreditCard, Loader2, Plus } from "lucide-react";

import toast from "@/app/libs/toast";

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

const money = (value: number) => `AU$${Number(value || 0).toLocaleString("en-AU")}`;

const brandLabel = (brand: string) =>
  ({
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners",
    jcb: "JCB",
    unionpay: "UnionPay",
  })[brand?.toLowerCase()] || "Card";

/**
 * The guest's "pay the booking total" control. Offers any card already on file
 * for a one-tap off-session charge, and falls back to hosted Stripe Checkout for
 * a new card (or when the saved card needs bank authentication).
 */
export default function PayNowPanel({
  reservationId,
  total,
  onPaid,
}: {
  reservationId: string;
  total: number;
  onPaid?: () => void;
}) {
  const [cards, setCards] = useState<SavedCard[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get<{ cards: SavedCard[] }>("/api/payments/methods")
      .then((r) => {
        if (active) setCards(r.data.cards || []);
      })
      .catch(() => {
        if (active) setCards([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const pay = async (paymentMethodId?: string) => {
    setBusy(true);
    try {
      const response = await axios.post<{ url?: string; paid?: boolean }>(
        `/api/reservations/${reservationId}/checkout`,
        paymentMethodId ? { paymentMethodId } : undefined,
      );
      if (response.data.url) {
        window.location.assign(response.data.url);
        return;
      }
      if (response.data.paid) {
        onPaid?.();
      }
      setBusy(false);
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Secure payment could not be opened"
          : "Secure payment could not be opened",
      );
      setBusy(false);
    }
  };

  const hasCards = cards && cards.length > 0;

  return (
    <div className="space-y-2.5">
      {hasCards &&
        cards!.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={busy}
            onClick={() => void pay(card.id)}
            className="inline-flex min-h-12 w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-sm bg-primary px-4 py-2 text-center text-sm font-semibold text-white hover:bg-primary-active disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            <span>Pay {money(total)}</span>
            <span className="font-normal text-white/80">
              {brandLabel(card.brand)} ···· {card.last4}
            </span>
          </button>
        ))}

      <button
        type="button"
        disabled={busy}
        onClick={() => void pay()}
        className={
          hasCards
            ? "inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-hairline bg-white px-4 text-sm font-semibold text-muted hover:border-border-strong disabled:opacity-50"
            : "inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-active disabled:opacity-50"
        }
      >
        {busy && !hasCards ? (
          <Loader2 size={18} className="animate-spin" />
        ) : hasCards ? (
          <Plus size={16} />
        ) : (
          <CreditCard size={18} />
        )}
        {hasCards ? "Use a different card" : `Pay ${money(total)} securely`}
      </button>

      <p className="text-center text-[11px] leading-4 text-muted">
        Redrive holds the funds until the return handover is agreed. Your card is
        saved for faster checkout next time.
      </p>
    </div>
  );
}
