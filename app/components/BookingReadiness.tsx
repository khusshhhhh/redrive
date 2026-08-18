"use client";

import Link from "next/link";
import { IconArrowRight, IconCheck, IconId, IconMailCheck, IconUserCheck } from "@tabler/icons-react";
import type { SafeUser } from "../types";
import useSearchModal from "../hooks/useSearchModal";

const BookingReadiness = ({ currentUser }: { currentUser: SafeUser }) => {
  const searchModal = useSearchModal();
  const profileReady = Boolean(currentUser.name && currentUser.number && currentUser.suburb && currentUser.state);
  const emailReady = Boolean(currentUser.emailVerified);
  const licenceReady = Boolean(currentUser.licenseImage) && currentUser.licenseStatus !== "EXPIRED" && currentUser.licenseStatus !== "REJECTED";
  const completed = [profileReady, emailReady, licenceReady].filter(Boolean).length;
  const ready = completed === 3;

  const items = [
    { label: "Profile details", ready: profileReady, icon: IconUserCheck, note: profileReady ? "Complete" : "Add contact and location details" },
    { label: "Email", ready: emailReady, icon: IconMailCheck, note: emailReady ? "Verified" : "Verification required" },
    { label: "Driving licence", ready: licenceReady, icon: IconId, note: licenceReady ? (currentUser.profileVerified === "Y" ? "Verified" : "Submitted") : "Upload required" },
  ];

  const next = !profileReady
    ? { href: "/profile#personal-details", label: "Complete profile" }
    : !emailReady
      ? { href: "/profile#verification", label: "Verify email" }
      : !licenceReady
        ? { href: "/profile#verification", label: "Add driving licence" }
        : null;

  return (
    <section className="rounded-md border border-hairline bg-white p-4 shadow-[0_8px_24px_rgba(24,54,58,0.06)] sm:p-5" aria-labelledby="booking-readiness-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-[210px]">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-primary"><IconCheck size={18} /></span>
            <div><h2 id="booking-readiness-heading" className="text-sm font-semibold text-ink">Booking readiness</h2><p className="text-xs text-muted">{completed} of 3 ready</p></div>
          </div>
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-3">
          {items.map((item) => <div key={item.label} className={`flex items-center gap-2.5 rounded-sm px-3 py-2.5 ${item.ready ? "bg-surface-soft" : "bg-amber-50"}`}><item.icon size={18} className={item.ready ? "text-secondary" : "text-amber-700"} /><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{item.label}</p><p className="truncate text-[11px] text-muted">{item.note}</p></div></div>)}
        </div>
        {next ? (
          <Link href={next.href} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-sm bg-ink px-4 text-xs font-semibold text-white transition hover:bg-primary">{next.label}<IconArrowRight size={16} /></Link>
        ) : (
          <button type="button" onClick={searchModal.onOpen} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-active">Plan a trip<IconArrowRight size={16} /></button>
        )}
      </div>
      {ready && <p className="sr-only">Your account is ready to submit booking requests.</p>}
    </section>
  );
};

export default BookingReadiness;
