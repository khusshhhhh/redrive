'use client';

import { Range } from 'react-date-range';
import Calendar from '../inputs/Calender';
import Button from '../Button';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { useRouter } from 'next/navigation';
import { SafeListing, SafeUser } from '@/app/types';
import { Zap } from "lucide-react";
import toast from "@/app/libs/toast";
import { calculateServiceFee, redriveFee as calcRedriveFee } from "@/app/libs/pricing";
import { clientLog } from "@/app/libs/clientLog";
import ProtectionSelector from "./ProtectionSelector";

interface ListingReservationProps {
    listing: SafeListing;
    price: number;
    dateRange: Range;
    totalPrice: number;
    totalFees: number;
    insuranceType: string;
    setInsuranceType: (type: string) => void;
    insuranceFee: number;
    setInsuranceFee: (fee: number) => void;
    serviceFee: number;
    onChangeDate: (value: Range) => void;
    onSubmit: (insuranceType: string, insuranceFee: number) => void;
    disabled?: boolean;
    disabledDates: Date[];
    currentUser?: SafeUser | null;
    onRequireLogin: () => void;
}

const ListingReservation: React.FC<ListingReservationProps> = ({
    listing,
    price,
    dateRange,
    totalPrice,
    onChangeDate,
    disabled,
    disabledDates,
    insuranceType,
    setInsuranceType,
    insuranceFee,
    setInsuranceFee,
    currentUser,
    onRequireLogin,
}) => {
    const redriveFee = calcRedriveFee(totalPrice);
    const serviceFee = calculateServiceFee(totalPrice);
    const dayCount = differenceInCalendarDays(dateRange.endDate, dateRange.startDate) + 1;
    const router = useRouter();

    // Availability guardrails set by the host. react-date-range already blocks
    // booked days from being picked; these cover the rules it can't express so
    // the guest sees why a range won't work before hitting Continue.
    const minTripDays = listing.minimumTripDays ?? 1;
    const maxTripDays = listing.maximumTripDays ?? 365;
    const noticeHours = listing.minimumNoticeHours ?? 0;
    const hasPickedRange = differenceInCalendarDays(dateRange.endDate, dateRange.startDate) > 0
        || dateRange.startDate.toDateString() !== new Date().toDateString();

    const earliestStart = new Date(Date.now() + noticeHours * 60 * 60 * 1000);
    const overlapsBooked = disabledDates.some(
        (d) => d >= dateRange.startDate && d <= dateRange.endDate,
    );

    let availabilityIssue: string | null = null;
    if (overlapsBooked) {
        availabilityIssue = "Some of the days you selected are already booked. Pick a range with no blocked dates.";
    } else if (hasPickedRange && noticeHours > 0 && dateRange.startDate < earliestStart) {
        availabilityIssue = noticeHours >= 24
            ? `This host needs at least ${Math.round(noticeHours / 24)} day${noticeHours >= 48 ? "s" : ""} notice. Choose a later start date.`
            : `This host needs at least ${noticeHours} hours notice. Choose a later start date.`;
    } else if (hasPickedRange && dayCount < minTripDays) {
        availabilityIssue = `Minimum trip length is ${minTripDays} day${minTripDays === 1 ? "" : "s"}. Extend your dates.`;
    } else if (hasPickedRange && dayCount > maxTripDays) {
        availabilityIssue = `Maximum trip length is ${maxTripDays} days. Shorten your dates.`;
    }

    const upfrontCleaningFee = listing.cleaningFeeOption === 'YES' ? (listing.cleaningFeeAmount || 0) : 0;
    const returnCleaningFee = listing.cleaningFeeOption === 'UPON_RETURNING' ? (listing.returnCleaningFeeAmount || 0) : 0;

    const handleInsuranceChange = (type: string, fee: number) => {
        setInsuranceType(type);
        setInsuranceFee(fee * dayCount);
    };

    const totalFees = totalPrice + redriveFee + serviceFee + insuranceFee + upfrontCleaningFee; // include cleaning fee if charged now

    const goodToKnow: { label: string; value: string }[] = [];
    if (listing.securityDeposit) goodToKnow.push({ label: "Security deposit", value: `AU$ ${listing.securityDeposit.toLocaleString()} (held, not charged)` });
    goodToKnow.push({
        label: "Kilometres",
        value: listing.dailyKmAllowance
            ? `${listing.dailyKmAllowance.toLocaleString()} km/day${listing.excessKmFee ? `, then AU$ ${listing.excessKmFee}/km` : ""}`
            : "Unlimited",
    });
    if (listing.deliveryAvailable && listing.deliveryFee) goodToKnow.push({ label: "Delivery", value: `AU$ ${listing.deliveryFee.toLocaleString()}` });
    if (listing.airportPickup) goodToKnow.push({ label: "Airport pickup", value: listing.airportPickupFee ? `AU$ ${listing.airportPickupFee.toLocaleString()}` : "Available" });
    if (listing.weeklyDiscountPercent) goodToKnow.push({ label: "Weekly discount", value: `${listing.weeklyDiscountPercent}%` });
    if (listing.roadsideAssistanceIncluded) goodToKnow.push({ label: "Roadside assistance", value: "Included" });

    return (
        <div className="bg-white shadow-card rounded-md border border-hairline-soft overflow-hidden mt-10 md:mt-0">
            <div className="p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Estimated trip total</div>
                <div className="mt-1 text-display-md font-semibold text-ink">AU$ {totalFees}</div>
                <div className="mt-1 text-xs text-muted">AU$ {price} per day · {dayCount} day{dayCount === 1 ? "" : "s"} · fees shown below</div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {listing.instantBook ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-secondary">
                            <Zap size={13} className="fill-secondary" /> Instant Book
                        </span>
                    ) : (
                        <span className="text-muted">Host reviews each request</span>
                    )}
                    {listing.hostResponseHours != null && (
                        <span className="text-muted">
                            {listing.hostResponseHours < 1
                                ? "· Usually replies within an hour"
                                : listing.hostResponseHours < 24
                                    ? `· Usually replies in ~${Math.ceil(listing.hostResponseHours)}h`
                                    : `· Usually replies in ~${Math.ceil(listing.hostResponseHours / 24)}d`}
                        </span>
                    )}
                </div>
            </div>
            <hr className="border-hairline-soft" />
            <Calendar value={dateRange} disabledDates={disabledDates} onChange={(value) => onChangeDate(value.selection)} />
            <hr className="border-hairline-soft" />
            <div className="mt-2 p-4 flex flex-col text-ink">
                <div className='font-semibold mb-4'>Basic Pricing</div>
                <div className="flex flex-row items-center justify-between font-normal text-body-sm">
                    <div>Reservation Cost</div>
                    <div className="font-normal">AU$ {totalPrice}</div>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between font-normal text-body-sm">
                    <div>Service Fee</div>
                    <div className="font-normal">AU$ {serviceFee}</div>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between font-normal text-body-sm">
                    <div>Redrive Fees</div>
                    <div className="font-normal">AU$ {redriveFee}</div>
                </div>
                {upfrontCleaningFee > 0 && (
                    <div className="mt-2 flex flex-row items-center justify-between font-normal text-body-sm">
                        <div>Cleaning Fee</div>
                        <div className="font-normal">AU$ {upfrontCleaningFee}</div>
                    </div>
                )}
                {returnCleaningFee > 0 && (
                    <div className="mt-2 text-sm text-muted">
                        Cleaning fee of AU$ {returnCleaningFee} will be charged upon return.
                    </div>
                )}
                <hr className="mt-6 border-hairline-soft" />

                <div className="mt-6">
                    <ProtectionSelector
                        value={insuranceType}
                        dayCount={dayCount}
                        securityDeposit={listing.securityDeposit}
                        onChange={(tier) => handleInsuranceChange(tier.value, tier.perDay)}
                    />
                </div>



                <hr className="mt-6 border-hairline-soft" />
                <div className="mt-6 flex flex-row items-center justify-between font-semibold text-body-sm">
                    <div>Total</div>
                    <div>AU$ {totalFees}</div>
                </div>
            </div>
            <hr className="border-hairline-soft" />
            {goodToKnow.length > 0 && (
                <>
                    <div className="p-4">
                        <div className="mb-3 font-semibold text-ink">Good to know</div>
                        <div className="flex flex-col gap-2">
                            {goodToKnow.map((item) => (
                                <div key={item.label} className="flex flex-row items-start justify-between gap-4 text-body-sm">
                                    <div className="text-muted">{item.label}</div>
                                    <div className="text-right font-medium text-ink">{item.value}</div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-xs leading-5 text-muted">Set by the host. Not included in the estimated total above.</p>
                    </div>
                    <hr className="border-hairline-soft" />
                </>
            )}
            <div className="p-4">
                {availabilityIssue && (
                    <p
                        role="status"
                        className="mb-3 rounded-sm border border-error/30 bg-surface-soft px-3 py-2 text-xs font-medium leading-5 text-error"
                    >
                        {availabilityIssue}
                    </p>
                )}
                <Button
                    disabled={disabled || Boolean(availabilityIssue)}
                    label="Continue"
                    onClick={() => {
                        if (!currentUser) {
                            onRequireLogin();
                            return;
                        }
                        if (!currentUser.emailVerified) {
                            toast.error("Verify your email before booking");
                            router.push("/profile#email-verification");
                            return;
                        }
                        if (!listing?.id) {
                            clientLog.error("Listing ID is missing on reservation submit");
                            toast.error("Something went wrong. Refresh and try again.");
                            return;
                        }

                        router.push(`/confirm-reservation?listingId=${listing.id}&startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}&totalPrice=${totalPrice}&totalFees=${totalFees}&insuranceType=${insuranceType}&insuranceFee=${insuranceFee}&cleaningFee=${upfrontCleaningFee}&returnCleaningFee=${returnCleaningFee}`);
                    }}
                />

            </div>
        </div>
    );
};

export default ListingReservation;
