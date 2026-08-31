'use client';

import { Range } from 'react-date-range';
import Calendar from '../inputs/Calender';
import Button from '../Button';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { useRouter } from 'next/navigation';
import { SafeListing, SafeUser } from '@/app/types';
import { Info } from "lucide-react";
import { Card, CardContent } from "../CardContent";
import { useState } from 'react';
import toast from "@/app/libs/toast";
import { calculateServiceFee, redriveFee as calcRedriveFee } from "@/app/libs/pricing";

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
    const [infoPopup, setInfoPopup] = useState<string | null>(null);

    const upfrontCleaningFee = listing.cleaningFeeOption === 'YES' ? (listing.cleaningFeeAmount || 0) : 0;
    const returnCleaningFee = listing.cleaningFeeOption === 'UPON_RETURNING' ? (listing.returnCleaningFeeAmount || 0) : 0;

    const insuranceDetails = {
        "Risk Taker": {
            price: "AU$ 20/day",
            description: "Covers minor damages but has a higher liability.",
            excess: "Excess of AU$ 4000 applies."
        },
        "Happy Driver": {
            price: "AU$ 40/day",
            description: "Full coverage for damages and reduced liability.",
            excess: "Excess of AU$ 500 applies."
        },
        "No Insurance": {
            price: "AU$ 0/day",
            description: "You are responsible for all damages."
        }
    };


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
                    <div className="font-semibold mb-4">Insurance Options</div>
                    <div className="flex flex-col space-y-3 relative">
                        {Object.keys(insuranceDetails).map((type) => (
                            <label key={type} className="flex flex-row gap-3 items-center cursor-pointer transition-all duration-300">
                                <input type="radio" name="insurance" value={type} checked={insuranceType === type} onChange={() => handleInsuranceChange(type, type === "Risk Taker" ? 20 : type === "Happy Driver" ? 40 : 0)} className="hidden" />
                                <div className={`mt-1 w-4 h-4 flex justify-center items-center border-2 rounded-full transition-all duration-300 ${insuranceType === type ? "border-ink bg-ink" : "border-hairline bg-white"}`}>{insuranceType === type && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                                <div className="flex flex-row items-center gap-3">
                                    <span className="text-body-sm font-medium">{type}</span>
                                    <button type="button" onClick={() => setInfoPopup(infoPopup === type ? null : type)}>
                                        <Info size={16} className="text-muted hover:text-ink" />
                                    </button>
                                </div>
                            </label>
                        ))}
                        {infoPopup && (
                            <Card className="absolute left-2 p-4 w-72 max-w-[calc(100vw-2rem)] z-10" onClose={() => setInfoPopup(null)}>
                                <CardContent>
                                    <div className="font-medium text-lg mb-2 text-ink">{infoPopup}</div>
                                    <div className="text-sm text-muted">{insuranceDetails[infoPopup].description}</div>
                                    {insuranceDetails[infoPopup].excess && <div className="text-sm text-muted mt-1">{insuranceDetails[infoPopup].excess}</div>}
                                    <div className="text-sm font-semibold mt-2 text-ink">{insuranceDetails[infoPopup].price}</div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
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
                <Button
                    disabled={disabled}
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
                            console.error("Listing ID is missing!");
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
