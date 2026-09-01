"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { CreditCard, Loader2, RefreshCw, Trash2 } from "lucide-react";

import toast from "@/app/libs/toast";

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

const brandLabel = (brand: string) =>
  ({
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  })[brand?.toLowerCase()] || "Card";

export default function SavedCards() {
  const [cards, setCards] = useState<SavedCard[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const refresh = () => {
    setLoadError(false);
    axios
      .get<{ cards: SavedCard[] }>("/api/payments/methods")
      .then((r) => setCards(r.data.cards || []))
      .catch(() => {
        setLoadError(true);
        setCards([]);
      });
  };

  useEffect(refresh, []);

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await axios.delete(`/api/payments/methods?id=${encodeURIComponent(id)}`);
      setCards((current) => (current || []).filter((card) => card.id !== id));
      toast.success("Card removed");
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Card could not be removed"
          : "Card could not be removed",
      );
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section
      id="payment-methods"
      className="scroll-mt-32 rounded-md border border-hairline-soft bg-white p-5 sm:p-8"
    >
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink">
          <CreditCard size={19} />
        </div>
        <div>
          <h2 className="text-display-sm font-semibold text-ink">
            Payment methods
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Cards you use at checkout are saved by Stripe so booking again — or
            extending a trip — is one tap.
          </p>
        </div>
      </div>

      {cards === null ? (
        <div className="skeleton-wave h-20 rounded-md" />
      ) : loadError ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-hairline-soft bg-surface-soft p-5 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-ink">
            Saved cards are unavailable right now
          </p>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-hairline bg-white px-4 text-sm font-semibold text-ink hover:bg-surface-soft"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-md border border-dashed border-hairline p-5 text-sm text-muted">
          No cards saved yet. The card you enter on your next booking is stored
          securely by Stripe for faster checkout.
        </div>
      ) : (
        <ul className="divide-y divide-hairline-soft rounded-md border border-hairline-soft">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink">
                  <CreditCard size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {brandLabel(card.brand)} ···· {card.last4}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={removing === card.id}
                onClick={() => void remove(card.id)}
                className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-sm border border-hairline px-3 text-xs font-semibold text-muted hover:border-border-strong hover:text-ink disabled:opacity-50 sm:self-auto"
              >
                {removing === card.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] leading-5 text-muted">
        Stripe stores the card securely. Redrive only ever sees the brand and
        last four digits.
      </p>
    </section>
  );
}
