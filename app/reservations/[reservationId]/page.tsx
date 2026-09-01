"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { differenceInCalendarDays, format } from "date-fns";
import toast from "@/app/libs/toast";
import {
  BadgeCheck,
  CalendarDays,
  CarFront,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Landmark,
  MapPin,
  MessageCircle,
  MessageSquareQuote,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Container from "@/app/components/Container";
import type { SafeReservation, SafeUser } from "@/app/types";
import HandoverPanel from "@/app/components/reservations/HandoverPanel";
import IncidentThread from "@/app/components/reservations/IncidentThread";
import TripExtensionPanel from "@/app/components/reservations/TripExtensionPanel";
import GuestReviewReply from "@/app/components/reservations/GuestReviewReply";
import TripStatusTimeline from "@/app/components/reservations/TripStatusTimeline";
import CancellationPolicyDisplay from "@/app/components/listings/CancellationPolicyDisplay";
import DriversCard from "@/app/components/reservations/DriversCard";
import PayNowPanel from "@/app/components/reservations/PayNowPanel";

const statusCopy: Record<
  string,
  { label: string; className: string; description: string }
> = {
  REVIEWING: {
    label: "Awaiting approval",
    className: "bg-surface-strong text-primary-active",
    description: "Review the request and respond when you’re ready.",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-50 text-green-700",
    description: "This booking is confirmed and ready for the next steps.",
  },
  ACTIVE: {
    label: "Trip active",
    className: "bg-blue-50 text-blue-700",
    description:
      "Pickup is agreed. Complete the return handover at the end of the booking.",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-50 text-green-700",
    description: "The return is agreed and the owner payout has been released.",
  },
  EXPIRED: {
    label: "Payment expired",
    className: "bg-red-50 text-red-700",
    description:
      "The booking was released because payment was not completed within 48 hours.",
  },
  DECLINED: {
    label: "Declined",
    className: "bg-red-50 text-red-700",
    description: "This booking request was not accepted.",
  },
};

const money = (value?: number | null) =>
  `AU$${Number(value || 0).toLocaleString("en-AU")}`;

export default function ReservationDetails() {
  const router = useRouter();
  const { reservationId } = useParams<{ reservationId: string }>();
  const [reservation, setReservation] = useState<SafeReservation | null>(null);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [startingPayment, setStartingPayment] = useState(false);
  const autoPayTried = useRef(false);

  const openCheckout = useCallback(async (id: string, paymentMethodId?: string) => {
    setStartingPayment(true);
    try {
      const response = await axios.post<{ url?: string; paid?: boolean }>(
        `/api/reservations/${id}/checkout`,
        paymentMethodId ? { paymentMethodId } : undefined,
      );
      if (response.data.url) {
        window.location.assign(response.data.url);
        return;
      }
      if (response.data.paid) {
        toast.success("Payment secured — your booking is confirmed.");
        await axios
          .get(`/api/reservations/${id}`)
          .then((r) => setReservation(r.data))
          .catch(() => undefined);
        router.refresh();
      }
      setStartingPayment(false);
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "Secure payment could not be opened"
          : "Secure payment could not be opened",
      );
      setStartingPayment(false);
    }
  }, [router]);

  useEffect(() => {
    Promise.all([
      axios.get("/api/auth/user"),
      axios.get(`/api/reservations/${reservationId}`),
    ])
      .then(([userResponse, reservationResponse]) => {
        setCurrentUser(userResponse.data);
        setReservation(reservationResponse.data);

        const params = new URLSearchParams(window.location.search);
        if (params.get("extension") === "paid") {
          toast.success("Trip extended — the new dates are confirmed.");
          router.replace(`/reservations/${reservationId}`);
        } else if (params.get("extension") === "cancelled") {
          router.replace(`/reservations/${reservationId}`);
        }

        // Landed here from a "Pay now" link — open secure checkout straight away.
        const wantsPay = params.get("pay") === "1";
        const res = reservationResponse.data;
        const paid = ["PAID_HELD", "RELEASED"].includes(res?.paymentStatus || "");
        const isGuest = userResponse.data?.id === res?.userId;
        if (wantsPay && isGuest && res?.status === "APPROVED" && !paid && !autoPayTried.current) {
          autoPayTried.current = true;
          router.replace(`/reservations/${reservationId}`);
          void openCheckout(res.id);
        }
      })
      .catch(() => toast.error("Failed to load reservation details"))
      .finally(() => setLoading(false));
  }, [reservationId, router, openCheckout]);

  if (loading) return <ReservationSkeleton />;
  if (!reservation)
    return (
      <div className="py-32 text-center text-error">Reservation not found.</div>
    );

  const listing = reservation.listing;
  const isHost = currentUser?.id === listing.userId;
  const otherUserId = isHost ? reservation.user.id : listing.userId;
  const duration = Math.max(
    1,
    differenceInCalendarDays(
      new Date(reservation.endDate),
      new Date(reservation.startDate),
    ) + 1,
  );
  const status = statusCopy[reservation.status] || {
    label: reservation.status,
    className: "bg-surface-soft text-muted",
    description: "Check the booking details below.",
  };

  const startChat = async () => {
    try {
      const response = await axios.post("/api/chats", { userId: otherUserId });
      router.push(`/messages/${response.data.id}`);
    } catch {
      toast.error("Failed to start chat");
    }
  };

  const updateStatus = async (nextStatus: "APPROVED" | "DECLINED") => {
    setUpdatingStatus(true);
    try {
      await axios.patch(`/api/reservations/${reservation.id}`, {
        status: nextStatus,
      });
      setReservation({ ...reservation, status: nextStatus });
      toast.success(
        nextStatus === "APPROVED"
          ? "Reservation approved"
          : "Reservation declined",
      );
      router.refresh();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
          "Reservation status could not be updated",
      );
      if (error.response?.data?.code === "PAYOUT_SETUP_REQUIRED")
        router.push("/profile#payouts");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const refreshReservation = () =>
    axios
      .get(`/api/reservations/${reservation.id}`)
      .then((response) => setReservation(response.data));

  return (
    <main className="bg-surface-soft/40 py-8 sm:py-12">
      <Container>
        <div className="mx-auto max-w-[1120px]">
          <button
            onClick={() => router.push("/reservations")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
          >
            <ChevronLeft size={17} /> Back to reservations
          </button>
          <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Reservation #{reservation.id.slice(-6).toUpperCase()}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                Reservation details
              </h1>
              <p className="mt-2 text-sm text-muted">
                Everything needed for a smooth booking and handover.
              </p>
            </div>
            <span
              className={`w-fit rounded-full px-4 py-2 text-xs font-semibold ${status.className}`}
            >
              {status.label}
            </span>
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-md border border-hairline-soft bg-white">
                <div className="relative aspect-[16/8] min-h-60">
                  <Image
                    src={listing.imageSrcs?.[0] || "/images/placeholder.png"}
                    alt={listing.title}
                    fill
                    priority
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <div className="absolute bottom-0 p-6 text-white">
                    <p className="text-2xl font-semibold">{listing.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                      <MapPin size={15} />
                      {listing.suburb}, {listing.state}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 p-5 text-sm sm:grid-cols-3 sm:p-6">
                  <Info
                    icon={<CarFront size={18} />}
                    label="Vehicle"
                    value={`${listing.company} ${listing.modal} · ${listing.year}`}
                  />
                  <Info
                    icon={<CalendarDays size={18} />}
                    label="Booking length"
                    value={`${duration} day${duration === 1 ? "" : "s"}`}
                  />
                  <Info
                    icon={<ShieldCheck size={18} />}
                    label="Cover"
                    value={reservation.insuranceType}
                  />
                </div>
              </section>

              <TripStatusTimeline reservation={reservation} />

              <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
                <SectionHeading
                  icon={<CalendarDays size={19} />}
                  title="Booking dates"
                  subtitle="Pickup and return dates for this reservation."
                />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <DateCard label="Pickup" date={reservation.startDate} />
                  <DateCard label="Return" date={reservation.endDate} />
                </div>
              </section>

              {reservation.message && (
                <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
                  <SectionHeading
                    icon={<MessageSquareQuote size={19} />}
                    title="Message for the host"
                    subtitle="Sent with the original booking request."
                  />
                  <p className="mt-6 whitespace-pre-wrap rounded-md border border-hairline-soft bg-surface-soft p-5 text-sm leading-6 text-body">
                    {reservation.message}
                  </p>
                </section>
              )}

              <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
                <SectionHeading
                  icon={<UserRound size={19} />}
                  title={isHost ? "Guest details" : "Booking contact"}
                  subtitle="Use Messages to keep booking communication together."
                />
                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                  <Image
                    src={reservation.user.image || "/images/placeholder.png"}
                    alt={`${reservation.user.name || "Redrive guest"} profile photo`}
                    width={72}
                    height={72}
                    className="h-18 w-18 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-ink">
                        {reservation.user.name || "Guest"}
                      </p>
                      {reservation.user.profileVerified === "Y" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-medium text-ink">
                          <BadgeCheck size={13} /> Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {reservation.user.email}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {reservation.user.number || "Phone number not provided"}
                    </p>
                  </div>
                  <button
                    onClick={() => void startChat()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-ink px-5 text-sm font-semibold text-ink hover:bg-surface-soft"
                  >
                    <MessageCircle size={17} /> Message
                  </button>
                </div>
              </section>
              {reservation.drivers && reservation.drivers.length > 0 && (
                <DriversCard
                  drivers={reservation.drivers}
                  viewerIsOwner={isHost}
                  reservationId={reservation.id}
                  canAddDriver={
                    currentUser?.id === reservation.userId &&
                    ["APPROVED", "ACTIVE"].includes(reservation.status) &&
                    ["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || "")
                  }
                  onChanged={() => void refreshReservation()}
                  guestTrack={{
                    ratingAvg: reservation.user.guestRatingAvg ?? null,
                    ratingCount: reservation.user.guestRatingCount ?? 0,
                    tripsCompleted: reservation.user.tripsAsGuestCompleted ?? 0,
                  }}
                />
              )}
              {currentUser &&
                ["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || "") &&
                ["APPROVED", "ACTIVE"].includes(reservation.status) && (
                  <TripExtensionPanel
                    reservationId={reservation.id}
                    isHost={isHost}
                    isGuest={currentUser.id === reservation.userId}
                    onChanged={() => void refreshReservation()}
                  />
                )}
              {currentUser && (
                <HandoverPanel
                  reservation={reservation}
                  currentUserId={currentUser.id}
                  onChanged={() => void refreshReservation()}
                />
              )}
              {currentUser && (
                <IncidentThread
                  reservationId={reservation.id}
                  currentUserId={currentUser.id}
                  onChanged={() => void refreshReservation()}
                />
              )}
              {currentUser && reservation.status === "COMPLETED" && currentUser.id === reservation.userId && (
                <GuestReviewReply reservationId={reservation.id} currentUserId={currentUser.id} />
              )}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-32">
              <CancellationPolicyDisplay value={reservation.cancellationPolicy} compact />
              <section className="rounded-md border border-hairline-soft bg-white p-6 shadow-card">
                <SectionHeading
                  icon={<CircleDollarSign size={19} />}
                  title="Price summary"
                  subtitle="The confirmed booking totals."
                />
                <div className="mt-6 space-y-3 text-sm">
                  <PriceRow
                    label="Vehicle hire"
                    value={reservation.totalPrice}
                  />
                  <PriceRow
                    label="Service fee"
                    value={reservation.serviceFee}
                  />
                  <PriceRow
                    label="Redrive fee"
                    value={reservation.redriveFee}
                  />
                  <PriceRow
                    label={`Cover · ${reservation.insuranceType}`}
                    value={reservation.insuranceFee}
                  />
                  {listing.cleaningFeeOption === "YES" && (
                    <PriceRow
                      label="Cleaning fee"
                      value={listing.cleaningFeeAmount}
                    />
                  )}
                  <div className="border-t border-hairline-soft pt-4">
                    <div className="flex items-center justify-between text-base font-semibold text-ink">
                      <span>Total</span>
                      <span>{money(reservation.totalFees)}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-md bg-graphite p-5 text-white">
                <div className="flex gap-3">
                  <Clock3 size={20} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">{status.label}</p>
                    <p className="mt-1 text-xs leading-5 text-white/70">
                      {status.description}
                    </p>
                  </div>
                </div>
              </section>
              {!isHost &&
                reservation.status === "APPROVED" &&
                !["PAID_HELD", "RELEASED"].includes(
                  reservation.paymentStatus || "",
                ) && (
                  <PayNowPanel
                    reservationId={reservation.id}
                    total={reservation.totalFees}
                    onPaid={() => void refreshReservation()}
                  />
                )}
              {reservation.paymentStatus === "PAID_HELD" && (
                <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  <div className="flex gap-2">
                    <ShieldCheck size={18} className="shrink-0" />
                    <div>
                      <p className="font-semibold">Payment secured</p>
                      <p className="mt-1 text-xs leading-5">
                        Redrive holds the owner amount until the return handover
                        is agreed by both parties.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {!isHost &&
                ["COMPLETED", "ACTIVE"].includes(reservation.status) && (
                  <a
                    href={`/listings/${listing.id}`}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-border-strong bg-white text-sm font-semibold text-ink hover:bg-surface-soft"
                  >
                    <CarFront size={17} /> Book this car again
                  </a>
                )}

              {isHost && reservation.status === "REVIEWING" && (
                <a
                  href="/profile#payouts"
                  className="flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  <Landmark size={15} /> Check host payout setup
                </a>
              )}

              {isHost && reservation.status === "REVIEWING" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={updatingStatus}
                    onClick={() => void updateStatus("DECLINED")}
                    className="h-12 rounded-sm border border-error bg-white text-sm font-semibold text-error hover:bg-red-50 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    disabled={updatingStatus}
                    onClick={() => void updateStatus("APPROVED")}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-primary text-sm font-semibold text-white hover:bg-primary-active disabled:opacity-50"
                  >
                    <Check size={17} /> Approve
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </Container>
    </main>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
        {icon}
      </span>
      <div>
        <h2 className="font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
function DateCard({ label, date }: { label: string; date: string }) {
  return (
    <div className="rounded-sm bg-surface-soft p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-ink">
        {format(new Date(date), "EEEE, d MMMM")}
      </p>
      <p className="mt-1 text-sm text-muted">
        {format(new Date(date), "yyyy")}
      </p>
    </div>
  );
}
function PriceRow({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 text-muted">
      <span>{label}</span>
      <span className="font-medium text-ink">{money(value)}</span>
    </div>
  );
}
function ReservationSkeleton() {
  return (
    <main className="bg-surface-soft/40 px-4 py-10">
      <div className="mx-auto max-w-[1120px] space-y-6">
        <div className="skeleton-wave h-9 w-64 rounded" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="skeleton-wave h-96 rounded-md" />
            <div className="skeleton-wave h-56 rounded-md" />
          </div>
          <div className="skeleton-wave h-80 rounded-md" />
        </div>
      </div>
    </main>
  );
}
