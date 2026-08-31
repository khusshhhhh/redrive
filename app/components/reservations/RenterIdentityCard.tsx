"use client";

import { BadgeCheck, IdCard, ShieldAlert, Star, X } from "lucide-react";

import type { RenterIdentityCheck } from "@/app/libs/bookingIdentity";

export interface GuestTrackRecord {
  ratingAvg: number | null;
  ratingCount: number;
  tripsCompleted: number;
}

const STATE_NAMES: Record<string, string> = {
  ACT: "Australian Capital Territory",
  NSW: "New South Wales",
  NT: "Northern Territory",
  QLD: "Queensland",
  SA: "South Australia",
  TAS: "Tasmania",
  VIC: "Victoria",
  WA: "Western Australia",
};

function formatDay(value: string | null) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function MatchRow({ label, matches }: { label: string; matches: boolean | null }) {
  const unknown = matches === null;
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`inline-flex items-center gap-1.5 text-sm font-semibold ${unknown ? "text-muted" : matches ? "text-emerald-700" : "text-red-700"}`}>
        {unknown ? "Not checked" : matches ? <><BadgeCheck size={15} /> Matches account</> : <><X size={15} /> Does not match</>}
      </dd>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

// The owner reviewing a request sees the checked result and the values printed
// on the licence, never the images themselves.
export default function RenterIdentityCard({
  identity,
  viewerIsOwner,
  renterFirstName,
  guestTrack,
}: {
  identity: RenterIdentityCheck;
  viewerIsOwner: boolean;
  renterFirstName: string;
  guestTrack?: GuestTrackRecord | null;
}) {
  const issuer = identity.issuerState ? STATE_NAMES[identity.issuerState] || identity.issuerState : null;
  const expiry = formatDay(identity.expiryDate);
  const checkedAt = formatDay(identity.checkedAt);

  return (
    <section className="rounded-md border border-hairline-soft bg-white p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
          <IdCard size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-ink">Identity check</h2>
          <p className="mt-1 text-sm text-muted">
            {viewerIsOwner
              ? `The driver licence ${renterFirstName} verified when sending this request.`
              : "The driver licence you verified when sending this request."}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${identity.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
        >
          {identity.verified ? <><BadgeCheck size={14} /> Verified</> : <><ShieldAlert size={14} /> Not verified</>}
        </span>
      </div>

      {identity.verified ? (
        <dl className="mt-5 divide-y divide-hairline-soft border-t border-hairline-soft">
          <DetailRow label="Name on licence" value={identity.holderName} />
          <MatchRow label="First name" matches={identity.firstNameMatches} />
          <MatchRow label="Date of birth" matches={identity.dateOfBirthMatches} />
          <DetailRow label="Issued by" value={issuer} />
          <DetailRow label="Expires" value={expiry} />
          <DetailRow label="Licence number" value={identity.licenceNumberLast4 ? `•••• ${identity.licenceNumberLast4}` : null} />
          <DetailRow label="Checked" value={checkedAt} />
        </dl>
      ) : (
        <p className="mt-5 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {identity.unmetReason}
          {viewerIsOwner ? " Ask for a current licence in Messages before approving this request." : " Verify a current licence before sending another request."}
        </p>
      )}

      {viewerIsOwner && guestTrack && (guestTrack.tripsCompleted > 0 || guestTrack.ratingCount > 0) && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline-soft pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            On Redrive
          </span>
          {guestTrack.ratingCount > 0 && guestTrack.ratingAvg != null && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              {guestTrack.ratingAvg.toFixed(1)}
              <span className="font-normal text-muted">
                ({guestTrack.ratingCount} host review{guestTrack.ratingCount === 1 ? "" : "s"})
              </span>
            </span>
          )}
          <span className="text-sm text-ink">
            {guestTrack.tripsCompleted} completed trip{guestTrack.tripsCompleted === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {viewerIsOwner && (
        <p className="mt-4 text-xs leading-5 text-muted">
          Redrive read this licence automatically and compared the first name and date of birth with the account details. It does not query a government issuer or confirm licence class, suspension or authenticity.
        </p>
      )}
    </section>
  );
}
