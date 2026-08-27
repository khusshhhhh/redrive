import { hasCurrentVerifiedLicense } from "@/app/libs/licenseVerification";

// What an owner is shown about the person asking to borrow their vehicle. It is
// the checked result and the values printed on the licence, never the images:
// an owner needs enough to judge the request, not a copy of a government ID.
export type RenterIdentityCheck = {
  verified: boolean;
  status: string;
  holderName: string | null;
  issuerState: string | null;
  expiryDate: string | null;
  licenceNumberLast4: string | null;
  firstNameMatches: boolean | null;
  dateOfBirthMatches: boolean | null;
  checkedAt: string | null;
  unmetReason: string | null;
};

type LicenceBearingUser = {
  licenseStatus?: string | null;
  licenseExpiresAt?: Date | string | null;
  licenseExpiryDate?: string | null;
  licenseIssuerState?: string | null;
  licenseHolderName?: string | null;
  licenseNumberLast4?: string | null;
  licenseNameMatches?: boolean | null;
  licenseDobMatches?: boolean | null;
  licenseVerifiedAt?: Date | string | null;
  licenseRejectionReason?: string | null;
};

const UNMET_REASONS: Record<string, string> = {
  NOT_SUBMITTED: "No licence has been checked on this account.",
  NEEDS_CONFIRMATION: "A licence was read but the printed details were never confirmed.",
  DETAILS_MISMATCH: "The licence details did not match the account details.",
  EXPIRED: "The licence had expired when it was checked.",
  REJECTED: "The licence check did not pass.",
};

function asIsoString(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function renterIdentityCheck(user: LicenceBearingUser): RenterIdentityCheck {
  const status = user.licenseStatus || "NOT_SUBMITTED";
  const verified = hasCurrentVerifiedLicense(status, user.licenseExpiresAt ?? null);

  // A licence checked before its expiry can lapse while a request is still open,
  // and the owner has to see that rather than a stale pass.
  const unmetReason = verified
    ? null
    : status === "VERIFIED"
      ? "The licence has expired since it was checked."
      : user.licenseRejectionReason || UNMET_REASONS[status] || "This licence has not been checked.";

  return {
    verified,
    status,
    holderName: user.licenseHolderName || null,
    issuerState: user.licenseIssuerState || null,
    expiryDate: user.licenseExpiryDate || null,
    licenceNumberLast4: user.licenseNumberLast4 || null,
    firstNameMatches: user.licenseNameMatches ?? null,
    dateOfBirthMatches: user.licenseDobMatches ?? null,
    checkedAt: asIsoString(user.licenseVerifiedAt),
    unmetReason,
  };
}
