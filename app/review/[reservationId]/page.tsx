"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios, { AxiosError } from "axios";
import Image from "next/image";
import toast from "@/app/libs/toast";
import StarRating from "@/app/components/inputs/StarRating";
import SuccessBurst from "@/app/components/SuccessBurst";

type Role = "GUEST" | "HOST";

interface ReservationResponse {
  status: string;
  user: { id: string; name: string | null; image: string | null };
  listing: { id: string; title: string; imageSrcs: string[]; userId: string };
}

const ReviewPage = () => {
  const router = useRouter();
  const params = useParams();
  const reservationId = params?.reservationId as string;

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!reservationId) return;
    Promise.all([
      axios.get<ReservationResponse>(`/api/reservations/${reservationId}`),
      axios.get<{ id: string }>("/api/auth/user").catch(() => null),
    ])
      .then(([reservationRes, userRes]) => {
        setReservation(reservationRes.data);
        setCurrentUserId(userRes?.data?.id ?? null);
      })
      .catch(() => setLoadFailed(true));
  }, [reservationId]);

  const role: Role | null = useMemo(() => {
    if (!reservation || !currentUserId) return null;
    if (reservation.listing.userId === currentUserId) return "HOST";
    if (reservation.user.id === currentUserId) return "GUEST";
    return null;
  }, [reservation, currentUserId]);

  // Check whether this side has already been submitted.
  useEffect(() => {
    if (!reservationId || role !== "HOST") return;
    axios
      .get<{ review: unknown }>(`/api/reservations/${reservationId}/guest-review`)
      .then((response) => setAlreadyDone(Boolean(response.data.review)))
      .catch(() => undefined);
  }, [reservationId, role]);

  const subjectName =
    role === "HOST" ? reservation?.user.name || "your guest" : reservation?.listing.title || "";
  const subjectImage =
    role === "HOST"
      ? reservation?.user.image || "/images/placeholder.png"
      : reservation?.listing.imageSrcs?.[0] || "/images/placeholder.png";

  const handleSubmit = async () => {
    if (!rating || text.trim().length < 3) {
      toast.error("Add a star rating and a few words.");
      return;
    }
    if (text.trim().split(/\s+/).length > 120) {
      toast.error("Keep it under about 120 words.");
      return;
    }
    if (!reservation || !role) return;

    setLoading(true);
    try {
      if (role === "HOST") {
        await axios.post(`/api/reservations/${reservationId}/guest-review`, {
          rating,
          text: text.trim(),
        });
      } else {
        await axios.post("/api/reviews", {
          listingId: reservation.listing.id,
          reservationId,
          rating,
          text: text.trim(),
        });
      }
      setDone(true);
    } catch (error) {
      toast.error(
        (error as AxiosError<{ error: string }>).response?.data?.error || "Something went wrong.",
      );
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SuccessBurst
        title="Thanks — your review is in"
        subtitle="It helps the next person on Redrive know what to expect."
        onDone={() => router.push(role === "HOST" ? "/reservations" : "/trips")}
      />
    );
  }

  if (loadFailed) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="text-sm text-muted">This review link could not be opened.</p>
      </main>
    );
  }

  if (!reservation || !role) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <div className="h-6 w-1/2 rounded shimmer" />
        <div className="h-40 rounded shimmer" />
        <div className="h-4 w-1/3 rounded shimmer" />
        <div className="h-4 rounded shimmer" />
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="text-sm text-muted">You have already reviewed this trip. Thanks.</p>
      </main>
    );
  }

  return (
    <main className="bg-surface-soft/35 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-lg rounded-md border border-hairline-soft bg-white p-4 shadow-card sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {role === "HOST" ? "Review your guest" : "Your experience"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          {role === "HOST" ? `How was ${subjectName}?` : `Review ${subjectName}`}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {role === "HOST"
            ? "Your review stays hidden until the guest reviews you too, or 14 days pass — so both sides are honest. It helps other hosts know who they're lending to."
            : "Your review stays hidden until the host reviews you too, or 14 days pass. Honest, specific reviews help the next guest choose well."}
        </p>

        <div className="relative mt-5 aspect-[16/10] overflow-hidden rounded-md">
          <Image
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            src={subjectImage}
            alt={subjectName}
            className="object-cover"
          />
        </div>

        <h2 className="mt-6 text-lg font-semibold text-ink">
          {role === "HOST" ? "Rate this guest" : "Rate your experience"}
        </h2>
        <div className="mt-3">
          <StarRating value={rating} onChange={setRating} precision={1} size={44} label="Rate out of five" />
          <p className="mt-1.5 text-xs text-muted">{rating ? `${rating} out of 5` : "Tap a star to rate"}</p>
        </div>

        <textarea
          className="mt-4 min-h-32 w-full resize-y rounded-sm border border-hairline p-3 text-base text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder={
            role === "HOST"
              ? "Were they communicative? Did they follow the rules and return the vehicle well?"
              : "What stood out? Anything the next guest should know?"
          }
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        <button
          className="mt-6 min-h-12 w-full rounded-sm bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-active disabled:opacity-50"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </main>
  );
};

export default ReviewPage;
