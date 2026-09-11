"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "@/app/libs/toast";
import { CalendarDays, ChevronLeft, Clock3, IdCard, Info, MapPin, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { effectivePickupWindow, formatWindow, resolvePickupTime, withinWindow } from "@/app/libs/bookingTimes";
import { resolveListingTimezone, tzAbbrev } from "@/app/libs/timezone";
import TimeSlotSelect from "@/app/components/inputs/TimeSlotSelect";

import Container from "@/app/components/Container";
import Button from "@/app/components/Button";
import InlineRetry from "@/app/components/InlineRetry";
import CancellationPolicyDisplay from "@/app/components/listings/CancellationPolicyDisplay";
import BookingDrivers, { type DriverPayload } from "@/app/components/reservations/BookingDrivers";
import SuccessBurst from "@/app/components/SuccessBurst";
import ProtectionSelector, { PROTECTION_TIERS } from "@/app/components/listings/ProtectionSelector";
import { guestDailyPrice } from "@/app/libs/pricing";
import type { SafeListing, SafeUser } from "@/app/types";
import { apiErrorMessage, apiErrorCode } from "@/app/libs/errorMessage";

type ConfirmListing = SafeListing & { user?: { name: string | null; image?: string | null } | null };
const money = (value: number) => `AU$${Math.round(value).toLocaleString("en-AU")}`;

export default function ConfirmReservation() {
  const params = useSearchParams();
  const router = useRouter();
  const listingId = params.get("listingId");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  const [listing, setListing] = useState<ConfirmListing | null>(null);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [drivers, setDrivers] = useState<DriverPayload[]>([]);
  const [driversReady, setDriversReady] = useState(false);
  const [insuranceType, setInsuranceType] = useState("No Insurance");
  const [celebrate, setCelebrate] = useState<{ title: string; subtitle: string; next: () => void } | null>(null);

  useEffect(() => {
    if (!listingId) { setLoading(false); return; }
    // The identity check lives on this screen, so the viewer's licence state has
    // to arrive with the listing rather than being fetched once it is needed.
    Promise.all([
      axios.get(`/api/listings/${listingId}`),
      // A signed-out visitor still gets to read the request they were building,
      // so a missing session must not read as a failure to load the booking.
      axios.get("/api/auth/user").catch(() => null),
    ])
      .then(([listingResponse, userResponse]) => {
        setListing(listingResponse.data);
        setCurrentUser(userResponse?.data ?? null);
        setLoadError(false);
        setPickupTime(
          resolvePickupTime({
            windowStart: listingResponse.data?.pickupWindowStart,
            windowEnd: listingResponse.data?.pickupWindowEnd,
          }),
        );
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [listingId, reloadKey]);

  const bookingDays = startDate && endDate ? Math.max(1, differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1) : 0;

  // The guest sees one all-in hire figure (host rate + Redrive's margin) plus
  // the add-ons they choose here. No platform-fee line ever appears.
  const protectionTier = PROTECTION_TIERS.find((tier) => tier.value === insuranceType) ?? PROTECTION_TIERS.find((tier) => tier.value === "No Insurance")!;
  const insuranceFee = protectionTier.perDay * bookingDays;

  const totals = useMemo(() => {
    const hire = listing ? guestDailyPrice(listing.price) * bookingDays : 0;
    const cleaningFee = listing?.cleaningFeeOption === "YES" ? Number(listing.cleaningFeeAmount || 0) : 0;
    return { hire, cleaningFee, total: hire + insuranceFee + cleaningFee };
  }, [listing, bookingDays, insuranceFee]);

  const effWindow = effectivePickupWindow(listing?.pickupWindowStart, listing?.pickupWindowEnd);
  const pickupWindowLabel =
    formatWindow(listing?.pickupWindowStart, listing?.pickupWindowEnd) ||
    (listing ? `${formatWindow(effWindow.start, effWindow.end)} (default)` : null);
  const vehicleTz = listing ? resolveListingTimezone(listing) : null;
  const vehicleTzLabel =
    vehicleTz && startDate ? tzAbbrev(new Date(startDate), vehicleTz) : "";
  const pickupTimeValid =
    !pickupTime || withinWindow(pickupTime, listing?.pickupWindowStart, listing?.pickupWindowEnd);
  const validRequest = Boolean(listingId && startDate && endDate && bookingDays > 0);

  const confirmBooking = async () => {
    if (!validRequest) {
      toast.error("This booking request is incomplete");
      return;
    }
    if (!driversReady) {
      toast.error("Add the primary driver's name and licence to send this request");
      document.getElementById("drivers")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!pickupTimeValid) {
      toast.error("Choose a pickup time inside the host's window");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post("/api/reservations", { listingId, startDate, endDate, insuranceType, message, drivers, pickupTime });
      if (data?.status === "APPROVED") {
        setCelebrate({
          title: "You’re approved!",
          subtitle: "Review your booking and pay to lock in the dates.",
          next: () => router.push(`/reservations/${data.id}?pay=1`),
        });
      } else {
        setCelebrate({
          title: "Booking request sent",
          subtitle: `${listing?.user?.name?.split(" ")[0] || "The host"} has been notified. We’ll let you know as soon as they respond.`,
          next: () => router.push("/trips"),
        });
      }
      return;
    } catch (error) {
      toast.error(apiErrorMessage(error, "Booking request could not be sent"));
      const code = apiErrorCode(error);
      if (code === "EMAIL_VERIFICATION_REQUIRED") {
        router.push("/profile#email-verification");
      }
      if (code === "DRIVER_LICENCE_REQUIRED") {
        document.getElementById("drivers")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } finally { setSubmitting(false); }
  };

  if (loading) return <ConfirmationSkeleton />;
  if (loadError) return <Container><div className="min-h-screen py-12"><InlineRetry title="Booking details unavailable" message="Your selected dates are still preserved. Try loading the vehicle details again." onRetry={() => { setLoading(true); setReloadKey((value) => value + 1); }} /></div></Container>;
  if (!listing || !validRequest) return <div className="min-h-screen py-32 text-center"><h1 className="text-2xl font-semibold text-ink">Booking details unavailable</h1><button onClick={() => router.push("/explore")} className="mt-5 text-sm font-semibold text-primary hover:underline">Return to listings</button></div>;

  const host = listing.user;

  return (
    <main className="bg-surface-soft/40 py-10 sm:py-14">
      {celebrate && <SuccessBurst title={celebrate.title} subtitle={celebrate.subtitle} onDone={celebrate.next} />}
      <Container>
        <div className="mx-auto max-w-[1180px]">
          <button onClick={() => router.back()} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"><ChevronLeft size={17} /> Back to vehicle</button>
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Final review</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-[2rem]">Confirm your booking request</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted">Check the dates, protection and full price before sending the request to the host. You won’t be charged from this screen.</p>
          </header>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="space-y-8">
              <section className="overflow-hidden rounded-lg border border-hairline-soft bg-white">
                <div className="grid sm:grid-cols-[240px_1fr]">
                  <div className="relative min-h-56"><Image src={listing.imageSrcs?.[0] || "/images/placeholder.png"} alt={listing.title} fill priority sizes="(max-width: 768px) 100vw, 400px" className="object-cover" /></div>
                  <div className="p-6 sm:p-7"><span className="text-xs font-semibold uppercase tracking-wider text-primary">{listing.category}</span><h2 className="mt-2 text-xl font-semibold text-ink">{listing.title}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} />{listing.suburb}, {listing.state}</p><div className="mt-6 flex items-center gap-3 border-t border-hairline-soft pt-6"><Image src={host?.image || "/images/placeholder.png"} alt={`${host?.name || "Redrive host"} profile photo`} width={44} height={44} className="h-11 w-11 rounded-[28%] object-cover" /><div><p className="text-xs text-muted">Hosted by</p><p className="font-semibold text-ink">{host?.name || "Redrive host"}</p></div></div></div>
                </div>
              </section>

              <section className="rounded-lg border border-hairline-soft bg-white p-6 sm:p-8">
                <SectionTitle icon={<CalendarDays size={19} />} title="Your trip" subtitle={`${bookingDays} day${bookingDays === 1 ? "" : "s"} reserved`} />
                <div className="mt-7 grid gap-5 sm:grid-cols-2"><DateBlock label="Pickup" value={startDate!} /><DateBlock label="Return" value={endDate!} /></div>
              </section>

              <section className="rounded-lg border border-hairline-soft bg-white p-6 sm:p-8">
                <SectionTitle icon={<Clock3 size={19} />} title="Pickup time" subtitle="When you'll collect the vehicle on the pickup day. It's set with your request; you or the host can adjust it later from the booking." />
                <div className="mt-7 max-w-xs">
                  <TimeSlotSelect
                    label="Preferred pickup time"
                    value={pickupTime}
                    onChange={setPickupTime}
                    windowStart={listing.pickupWindowStart}
                    windowEnd={listing.pickupWindowEnd}
                    hint={
                      [
                        pickupWindowLabel ? `Host's window: ${pickupWindowLabel}` : null,
                        vehicleTzLabel ? `Times shown in ${vehicleTzLabel} (the vehicle's local time)` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                  />
                </div>
                {!pickupTimeValid && (
                  <p className="mt-3 text-xs leading-5 text-amber-700">
                    Choose a time inside the host&rsquo;s pickup window.
                  </p>
                )}
                <div className="mt-5 rounded-md bg-surface-soft p-5 text-xs leading-6 text-muted">
                  <p className="font-semibold text-ink">Returning the vehicle</p>
                  <p className="mt-1.5">
                    You&rsquo;ll set the return time once the trip is confirmed — the host is notified and confirms it.
                    {listing.handoverMethod
                      ? ` Handover method: ${handoverMethodLabel(listing.handoverMethod)}.`
                      : ""}
                  </p>
                  {listing.pickupInstructions && (
                    <p className="mt-1.5 whitespace-pre-wrap">{listing.pickupInstructions}</p>
                  )}
                </div>
              </section>

              <CancellationPolicyDisplay value={listing.cancellationPolicy} />

              <section className="rounded-lg border border-hairline-soft bg-white p-6 sm:p-8">
                <SectionTitle icon={<ShieldCheck size={19} />} title="Damage protection" subtitle="Choose the cover for this trip. It's added to your total below." />
                <div className="mt-7">
                  <ProtectionSelector
                    value={insuranceType}
                    dayCount={bookingDays}
                    securityDeposit={listing.securityDeposit}
                    onChange={(tier) => setInsuranceType(tier.value)}
                  />
                </div>
              </section>

              <section className="rounded-lg border border-hairline-soft bg-white p-6 sm:p-8">
                <SectionTitle icon={<Send size={19} />} title="Message to the host" subtitle={`Help ${host?.name?.split(" ")[0] || "the host"} understand what you have planned.`} />
                <label htmlFor="booking-message" className="mt-7 block text-sm font-semibold text-ink">Message</label>
                <div className="relative mt-2.5">
                  <textarea
                    id="booking-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={1500}
                    rows={6}
                    placeholder="Tell the host why you’re hiring the vehicle, where you’re heading, and anything useful about your plans."
                    className="min-h-40 w-full resize-y rounded-md border border-hairline bg-surface-soft/50 px-4 py-3.5 pr-14 text-sm leading-6 text-ink outline-none transition placeholder:text-muted-soft focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white px-2 py-1 text-[10px] font-semibold tabular-nums text-muted shadow-sm">{message.length}/1500</span>
                </div>
                <p className="mt-2.5 text-xs leading-5 text-muted">This will be attached to your booking request. Avoid sharing payment or identity details.</p>
              </section>

              {currentUser ? (
                <BookingDrivers
                  defaultName={currentUser.name}
                  onChange={(next, ready) => {
                    setDrivers(next);
                    setDriversReady(ready);
                  }}
                />
              ) : (
                <section id="drivers" className="scroll-mt-28 rounded-lg border border-hairline-soft bg-white p-6 sm:p-8">
                  <SectionTitle icon={<IdCard size={19} />} title="Who's driving?" subtitle="Sign in to add drivers and send this request." />
                  <p className="mt-7 rounded-md border border-hairline bg-surface-soft p-4 text-sm leading-6 text-muted">
                    Sign in to add the driver details and send this request.
                  </p>
                </section>
              )}

              <section className="rounded-lg border border-hairline-soft bg-white p-6 sm:p-8">
                <SectionTitle icon={<Sparkles size={19} />} title="What happens next" subtitle="This sends a request—it does not instantly confirm the booking." />
                <div className="mt-7 space-y-5">
                  <Step number="1" title="The host reviews your request" copy="They’ll check the dates and booking details before responding." />
                  <Step number="2" title="You receive a notification" copy="Redrive lets you know as soon as the host approves or declines." />
                  <Step number="3" title="Keep plans in Messages" copy="Use Redrive chat for questions and handover arrangements." />
                </div>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-32">
              <section className="rounded-lg border border-hairline-soft bg-white p-7 shadow-card">
                <h2 className="text-lg font-semibold text-ink">Price details</h2>
                <div className="mt-6 space-y-3.5 text-sm">
                  <PriceRow label={`Vehicle hire · ${bookingDays} day${bookingDays === 1 ? "" : "s"}`} value={totals.hire} />
                  {insuranceFee > 0 && <PriceRow label={`Damage protection · ${insuranceType}`} value={insuranceFee} />}
                  {totals.cleaningFee > 0 && <PriceRow label="Cleaning fee" value={totals.cleaningFee} />}
                  {listing.cleaningFeeOption === "UPON_RETURNING" && <div className="flex gap-2 rounded-md bg-surface-soft p-3.5 text-xs leading-5 text-muted"><Info size={15} className="mt-0.5 shrink-0" />A {money(Number(listing.returnCleaningFeeAmount || 0))} cleaning fee may be charged after return.</div>}
                  <div className="border-t border-hairline-soft pt-5">
                    <div className="flex items-center justify-between text-lg font-semibold text-ink"><span>Total</span><span>{money(totals.total)}</span></div>
                    <p className="mt-1.5 text-xs text-muted">AUD · final request total</p>
                  </div>
                </div>
                {!driversReady && (
                  <p className="mt-7 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
                    <IdCard size={15} className="mt-0.5 shrink-0" />
                    Add the primary driver&rsquo;s name and licence photo to send this request.
                  </p>
                )}
                <div className="mt-7"><Button label={listing?.instantBook ? "Book now" : "Send booking request"} disabled={!driversReady} loading={submitting} loadingLabel={listing?.instantBook ? "Booking" : "Sending request"} onClick={confirmBooking} /></div>
                <p className="mt-2.5 text-xs leading-5 text-muted">{listing?.instantBook ? "This vehicle books instantly. You'll pay on the next screen to confirm — your card isn't charged until then." : "The host reviews your request and you're only charged once they accept."}</p>
                <p className="mt-3.5 text-center text-[11px] leading-5 text-muted">By requesting, you agree to Redrive’s booking and cancellation terms.</p>
              </section>
              <div className="flex gap-3 rounded-lg bg-graphite p-6 text-white"><Clock3 size={19} className="mt-0.5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">No charge yet</p><p className="mt-1 text-xs leading-5 text-white/70">The host must approve this request before the booking is confirmed.</p></div></div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted"><MessageCircle size={14} /> Questions? Message the host after requesting.</div>
            </aside>
          </div>
        </div>
      </Container>
    </main>
  );
}

function handoverMethodLabel(method: string): string {
  return (
    { IN_PERSON: "in person", LOCKBOX: "lockbox / key safe", SELF_CHECKIN: "self check-in" }[method] ||
    method.toLowerCase().replace(/_/g, " ")
  );
}
function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) { return <div className="flex gap-3.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">{icon}</span><div><h2 className="text-base font-semibold text-ink">{title}</h2><p className="mt-1 text-xs leading-5 text-muted">{subtitle}</p></div></div>; }
function DateBlock({ label, value }: { label: string; value: string }) { const date = new Date(value); return <div className="rounded-md border border-hairline-soft p-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p><p className="mt-2 font-semibold text-ink">{format(date, "EEEE, d MMMM")}</p><p className="mt-1 text-sm text-muted">{format(date, "yyyy")}</p></div>; }
function Step({ number, title, copy }: { number: string; title: string; copy: string }) { return <div className="flex gap-3.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{number}</span><div><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{copy}</p></div></div>; }
function PriceRow({ label, value }: { label: string; value: number }) { return <div className="flex items-start justify-between gap-4 text-muted"><span>{label}</span><span className="font-medium text-ink">{money(value)}</span></div>; }
function ConfirmationSkeleton() { return <main className="min-h-screen bg-surface-soft/40 px-4 py-12"><div className="mx-auto max-w-[1180px] space-y-8"><div className="skeleton-wave h-10 w-80 max-w-full rounded" /><div className="grid gap-8 lg:grid-cols-[1fr_400px]"><div className="space-y-8"><div className="skeleton-wave h-64 rounded-lg" /><div className="skeleton-wave h-52 rounded-lg" /><div className="skeleton-wave h-72 rounded-lg" /><div className="skeleton-wave h-64 rounded-lg" /></div><div className="skeleton-wave h-96 rounded-lg" /></div></div></main>; }
