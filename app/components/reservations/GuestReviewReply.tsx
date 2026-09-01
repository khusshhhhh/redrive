"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { MessageSquareQuote, Star } from "lucide-react";

import toast from "@/app/libs/toast";

interface GuestReview {
  id: string;
  subjectUserId: string;
  rating: number;
  text: string;
  response: string | null;
  publishedAt: string | null;
}

export default function GuestReviewReply({
  reservationId,
  currentUserId,
}: {
  reservationId: string;
  currentUserId: string;
}) {
  const [review, setReview] = useState<GuestReview | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axios
      .get<{ review: GuestReview | null }>(`/api/reservations/${reservationId}/guest-review`)
      .then((response) => setReview(response.data.review))
      .catch(() => undefined);
  }, [reservationId]);

  if (!review || review.subjectUserId !== currentUserId || !review.publishedAt) return null;

  const submit = async () => {
    if (reply.trim().length < 3) return;
    setBusy(true);
    try {
      await axios.patch(`/api/reservations/${reservationId}/guest-review`, { response: reply.trim() });
      setReview({ ...review, response: reply.trim() });
      toast.success("Reply posted.");
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Reply could not be saved"
          : "Reply could not be saved",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
          <MessageSquareQuote size={19} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">The host&rsquo;s review of you</h2>
          <p className="mt-1 text-sm text-muted">
            This is on your Redrive track record. Future hosts see it when you request their vehicle.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-hairline-soft p-4">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              className={i < review.rating ? "fill-accent text-accent" : "text-hairline"}
            />
          ))}
        </div>
        <p className="mt-2 text-sm leading-6 text-body">{review.text}</p>

        {review.response ? (
          <p className="mt-3 rounded-sm bg-surface-soft p-2.5 text-sm leading-6 text-body">
            <span className="font-semibold text-ink">Your reply:</span> {review.response}
          </p>
        ) : (
          <div className="mt-3">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value.slice(0, 1500))}
              rows={2}
              placeholder="Reply publicly — brief and professional works best."
              className="w-full rounded-sm border border-hairline bg-white p-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || reply.trim().length < 3}
              onClick={() => void submit()}
              className="mt-2 h-9 rounded-sm bg-accent px-3 text-xs font-semibold text-ink disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post reply"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
