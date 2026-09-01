"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "@/app/libs/toast";
import { CalendarDays, ChevronLeft, Clock3, IdCard, Info, MapPin, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";

import Container from "@/app/components/Container";
import Button from "@/app/components/Button";
import InlineRetry from "@/app/components/InlineRetry";
import CancellationPolicyDisplay from "@/app/components/listings/CancellationPolicyDisplay";
import BookingDrivers, { type DriverPayload } from "@/app/components/reservations/BookingDrivers";
import SuccessBurst from "@/app/components/SuccessBurst";
import { PROTECTION_TIERS } from "@/app/components/listings/ProtectionSelector";
import { calculateServiceFee, redriveFee as calcRedriveFee } from "@/app/libs/pricing";
import type { SafeUser } from "@/app/types";
const money = (value: number) => `AU$${value.toLocaleString("en-AU")}`;

export default function ConfirmReservation() {
  const params = useSearchParams();
  const router = useRouter();
  const listingId = params.get("listingId");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const basePrice = Number(params.get("totalPrice") || 0);
  const insuranceType = params.get("insuranceType") || "No Insurance";
  const insuranceFee = Number(params.get("insuranceFee") || 0);

  const [listing, setListing] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [drivers, setDrivers] = useState<DriverPayload[]>([]);
  const [driversReady, setDriversReady] = useState(false);
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
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [listingId, reloadKey]);

  const totals = useMemo(() => {
    const serviceFee = calculateServiceFee(basePrice);
    const redriveFee = calcRedriveFee(basePrice);
    const cleaningFee = listing?.cleaningFeeOption === "YES" ? Number(listing.cleaningFeeAmount || 0) : 0;
    return { serviceFee, redriveFee, cleaningFee, total: basePrice + serviceFee + redriveFee + insuranceFee + cleaningFee };
  }, [basePrice, insuranceFee, listing]);

  const bookingDays = startDate && endDate ? Math.max(1, differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1) : 0;
  const validRequest = listingId && startDate && endDate && basePrice > 0;

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
    setSubmitting(true);
    try {
      const { data } = await axios.post("/api/reservations", { listingId, startDate, endDate, totalPrice: basePrice, insuranceType, insuranceFee, message, drivers });
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Booking request could not be sent");
      if (error.response?.data?.code === "EMAIL_VERIFICATION_REQUIRED") {
        router.push("/profile#email-verification");
      }
      if (error.response?.data?.code === "DRIVER_LICENCE_REQUIRED") {
        document.getElementById("drivers")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } finally { setSubmitting(false); }
  };

  if (loading) return <ConfirmationSkeleton />;
  if (loadError) return <Container><div className="py-12"><InlineRetry title="Booking details unavailable" message="Your selected dates are still preserved. Try loading the vehicle details again." onRetry={() => { setLoading(true); setReloadKey((value) => value + 1); }} /></div></Container>;
  if (!listing || !validRequest) return <div className="py-32 text-center"><h1 className="text-2xl font-semibold text-ink">Booking details unavailable</h1><button onClick={() => router.push("/explore")} className="mt-5 text-sm font-semibold text-primary hover:underline">Return to listings</button></div>;

  const host = listing.user;

  return (
    <main className="bg-surface-soft/40 py-8 sm:py-12">
      {celebrate && <SuccessBurst title={celebrate.title} subtitle={celebrate.subtitle} onDone={celebrate.next} />}
      <Container>
        <div className="mx-auto max-w-[1120px]">
          <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"><ChevronLeft size={17} /> Back to vehicle</button>
          <header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Final review</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Confirm your booking request</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Check the dates, protection and full price before sending the request to the host. You won’t be charged from this screen.</p></header>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-md border border-hairline-soft bg-white">
                <div className="grid sm:grid-cols-[240px_1fr]">
                  <div className="relative min-h-56"><Image src={listing.imageSrcs?.[0] || "/images/placeholder.png"} alt={listing.title} fill priority className="object-cover" /></div>
                  <div className="p-5 sm:p-6"><span className="text-xs font-semibold uppercase tracking-wider text-primary">{listing.category}</span><h2 className="mt-2 text-xl font-semibold text-ink">{listing.title}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} />{listing.suburb}, {listing.state}</p><div className="mt-5 flex items-center gap-3 border-t border-hairline-soft pt-5"><Image src={host?.image || "/images/placeholder.png"} alt={`${host?.name || "Redrive host"} profile photo`} width={44} height={44} className="h-11 w-11 rounded-[28%] object-cover" /><div><p className="text-xs text-muted">Hosted by</p><p className="font-semibold text-ink">{host?.name || "Redrive host"}</p></div></div></div>
                </div>
              </section>

              <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
                <SectionTitle icon={<CalendarDays size={19} />} title="Your trip" subtitle={`${bookingDays} day${bookingDays === 1 ? "" : "s"} reserved`} />
                <div className="mt-6 grid gap-4 sm:grid-cols-2"><DateBlock label="Pickup" value={startDate!} /><DateBlock label="Return" value={endDate!} /></div>
              </section>

              <CancellationPolicyDisplay value={listing.cancellationPolicy} />

              <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
                <SectionTitle icon={<ShieldCheck size={19} />} title="Protection selection" subtitle="Review the cover selected on the listing page." />
                <div className="mt-6 flex items-start justify-between gap-5 rounded-sm bg-surface-soft p-5"><div><p className="font-semibold text-ink">{insuranceType}</p><p className="mt-1 text-xs leading-5 text-muted">{insuranceType === "No Insurance" ? "You selected no additional protection. Review your responsibility before continuing." : "Your selected protection is included for the full booking period."}</p></div><span className="shrink-0 font-semibold text-ink">{money(insuranceFee)}</span></div>
                {(() => {
                  const tier = PROTECTION_TIERS.find((t) => t.value === insuranceType);
                  const deposit = Number(listing.securityDeposit || 0);
                  if (!tier && !deposit) return null;
                  return (
                    <p className="mt-3 text-xs leading-5 text-muted">
                      {tier?.excess != null
                        ? `Your excess — the most you'd pay for damage — is ${money(tier.excess)}. `
                        : tier
                          ? "With no cover you're responsible for the full repair cost of any damage. "
                          : ""}
                      {deposit
                        ? `The host holds a refundable ${money(deposit)} security deposit against the excess; it's only charged if there's a claim.`
                        : ""}
                    </p>
                  );
                })()}
              </section>

              <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
                <SectionTitle icon={<Send size={19} />} title="Message to the host" subtitle={`Help ${host?.name?.split(" ")[0] || "the host"} understand what you have planned.`} />
                <label htmlFor="booking-message" className="mt-6 block text-sm font-semibold text-ink">Message</label>
                <div className="relative mt-2">
                  <textarea
                    id="booking-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={1500}
                    rows={6}
                    placeholder="Tell the host why you’re hiring the vehicle, where you’re heading, and anything useful about your plans."
                    className="min-h-36 w-full resize-y rounded-md border border-hairline bg-surface-soft/50 px-4 py-3 pr-14 text-sm leading-6 text-ink outline-none transition placeholder:text-muted-soft focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white px-2 py-1 text-[10px] font-semibold tabular-nums text-muted shadow-sm">{message.length}/1500</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">This will be attached to your booking request. Avoid sharing payment or identity details.</p>
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
                <section id="drivers" className="scroll-mt-28 rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
                  <SectionTitle icon={<IdCard size={19} />} title="Who's driving?" subtitle="Sign in to add drivers and send this request." />
                  <p className="mt-6 rounded-sm border border-hairline bg-surface-soft p-4 text-sm leading-6 text-muted">
                    Sign in to add the driver details and send this request.
                  </p>
                </section>
              )}

              <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
                <SectionTitle icon={<Sparkles size={19} />} title="What happens next" subtitle="This sends a request—it does not instantly confirm the booking." />
                <div className="mt-6 space-y-4">
                  <Step number="1" title="The host reviews your request" copy="They’ll check the dates and booking details before responding." />
                  <Step number="2" title="You receive a notification" copy="Redrive lets you know as soon as the host approves or declines." />
                  <Step number="3" title="Keep plans in Messages" copy="Use Redrive chat for questions and handover arrangements." />
                </div>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-32">
              <section className="rounded-md border border-hairline-soft bg-white p-6 shadow-card">
                <h2 className="text-lg font-semibold text-ink">Price details</h2>
                <div className="mt-5 space-y-3 text-sm"><PriceRow label={`Vehicle hire · ${bookingDays} days`} value={basePrice} /><PriceRow label="Service fee" value={totals.serviceFee} /><PriceRow label="Redrive fee" value={totals.redriveFee} /><PriceRow label={`Protection · ${insuranceType}`} value={insuranceFee} />{totals.cleaningFee > 0 && <PriceRow label="Cleaning fee" value={totals.cleaningFee} />}{listing.cleaningFeeOption === "UPON_RETURNING" && <div className="flex gap-2 rounded-sm bg-surface-soft p-3 text-xs leading-5 text-muted"><Info size={15} className="mt-0.5 shrink-0" />A {money(Number(listing.returnCleaningFeeAmount || 0))} cleaning fee may be charged after return.</div>}<div className="border-t border-hairline-soft pt-4"><div className="flex items-center justify-between text-lg font-semibold text-ink"><span>Total</span><span>{money(totals.total)}</span></div><p className="mt-1 text-xs text-muted">AUD · final request total</p></div></div>
                {!driversReady && (
                  <p className="mt-6 flex gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    <IdCard size={15} className="mt-0.5 shrink-0" />
                    Add the primary driver&rsquo;s name and licence photo to send this request.
                  </p>
                )}
                <div className="mt-6"><Button label={listing?.instantBook ? "Book now" : "Send booking request"} disabled={!driversReady} loading={submitting} loadingLabel={listing?.instantBook ? "Booking" : "Sending request"} onClick={confirmBooking} /></div>
                <p className="mt-2 text-xs leading-5 text-muted">{listing?.instantBook ? "This vehicle books instantly. You'll pay on the next screen to confirm — your card isn't charged until then." : "The host reviews your request and you're only charged once they accept."}</p>
                <p className="mt-3 text-center text-[11px] leading-5 text-muted">By requesting, you agree to Redrive’s booking and cancellation terms.</p>
              </section>
              <div className="flex gap-3 rounded-md bg-graphite p-5 text-white"><Clock3 size={19} className="mt-0.5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">No charge yet</p><p className="mt-1 text-xs leading-5 text-white/70">The host must approve this request before the booking is confirmed.</p></div></div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted"><MessageCircle size={14} /> Questions? Message the host after requesting.</div>
            </aside>
          </div>
        </div>
      </Container>
    </main>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) { return <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">{icon}</span><div><h2 className="font-semibold text-ink">{title}</h2><p className="mt-1 text-xs leading-5 text-muted">{subtitle}</p></div></div>; }
function DateBlock({ label, value }: { label: string; value: string }) { const date = new Date(value); return <div className="rounded-sm border border-hairline-soft p-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p><p className="mt-2 font-semibold text-ink">{format(date, "EEEE, d MMMM")}</p><p className="mt-1 text-sm text-muted">{format(date, "yyyy")}</p></div>; }
function Step({ number, title, copy }: { number: string; title: string; copy: string }) { return <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{number}</span><div><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{copy}</p></div></div>; }
function PriceRow({ label, value }: { label: string; value: number }) { return <div className="flex items-start justify-between gap-4 text-muted"><span>{label}</span><span className="font-medium text-ink">{money(value)}</span></div>; }
function ConfirmationSkeleton() { return <main className="bg-surface-soft/40 px-4 py-10"><div className="mx-auto max-w-[1120px] space-y-6"><div className="skeleton-wave h-10 w-80 max-w-full rounded" /><div className="grid gap-6 lg:grid-cols-[1fr_380px]"><div className="space-y-6"><div className="skeleton-wave h-64 rounded-md" /><div className="skeleton-wave h-52 rounded-md" /></div><div className="skeleton-wave h-96 rounded-md" /></div></div></main>; }
