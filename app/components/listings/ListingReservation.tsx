'use client';

import { Range } from 'react-date-range';
import Calendar from '../inputs/Calender';
import Button from '../Button';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';
import { useRouter } from 'next/navigation';
import { SafeListing } from '@/app/types';
import { Info } from "lucide-react";
import { Card, CardContent } from "../CardContent";
import { useState } from 'react';

const calculateServiceFee = (totalPrice: number): number => {
    if (totalPrice <= 200) return 10;
    if (totalPrice <= 400) return 25;
    if (totalPrice <= 800) return 40;
    if (totalPrice <= 1200) return 60;
    if (totalPrice <= 2000) return 80;
    return 100;
};

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
    onSubmit: (insuranceType: string, insuranceFee: number) => void; // ✅ Updated to pass insurance details
    disabled?: boolean;
    disabledDates: Date[];
}

const ListingReservation: React.FC<ListingReservationProps> = ({
    listing,
    price,
    dateRange,
    totalPrice,
    onChangeDate,
    // onSubmit,
    disabled,
    disabledDates,
    insuranceType,
    setInsuranceType,
    insuranceFee,
    setInsuranceFee,
}) => {
    const redriveFee = Math.round(totalPrice * 0.08);
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

    return (
        <div className="bg-white dark:bg-gray-800 shadow-none md:shadow-lg shadow-gray-600/20 rounded-xl border-[1px] border-neutral-200 dark:border-gray-600 overflow-hidden mt-10 md:mt-0">
            <div className="flex flex-row items-center gap-1 p-4">
                <div className="text-2xl font-semibold">$ {price}</div>
                <div className="font-light text-neutral-600">per day</div>
            </div>
            <hr />
            <Calendar value={dateRange} disabledDates={disabledDates} onChange={(value) => onChangeDate(value.selection)} />
            <hr />
            <div className="mt-2 p-4 flex flex-col">
                <div className='font-bold mb-4'>Basic Pricing</div>
                <div className="flex flex-row items-center justify-between font-normal text-base">
                    <div>Reservation Cost</div>
                    <div className="font-normal">AU$ {totalPrice}</div>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between font-normal text-base">
                    <div>Service Fee</div>
                    <div className="font-normal">AU$ {serviceFee}</div>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between font-normal text-base">
                    <div>Redrive Fees</div>
                    <div className="font-normal">AU$ {redriveFee}</div>
                </div>
                {upfrontCleaningFee > 0 && (
                    <div className="mt-2 flex flex-row items-center justify-between font-normal text-base">
                        <div>Cleaning Fee</div>
                        <div className="font-normal">AU$ {upfrontCleaningFee}</div>
                    </div>
                )}
                {returnCleaningFee > 0 && (
                    <div className="mt-2 text-sm text-neutral-600">
                        Cleaning fee of AU$ {returnCleaningFee} will be charged upon return.
                    </div>
                )}
                <hr className="mt-6" />

                {/* ✅ Styled Insurance Options */}
                <div className="mt-6">
                    <div className="font-bold mb-4">Insurance Options</div>
                    <div className="flex flex-col space-y-3 relative">
                        {Object.keys(insuranceDetails).map((type) => (
                            <label key={type} className="flex flex-row gap-3 items-center cursor-pointer transition-all duration-300 hover:border-black dark:hover:border-gray-300">
                                <input type="radio" name="insurance" value={type} checked={insuranceType === type} onChange={() => handleInsuranceChange(type, type === "Risk Taker" ? 20 : type === "Happy Driver" ? 40 : 0)} className="hidden" />
                                <div className={`mt-1 w-4 h-4 flex justify-center items-center border-2 rounded-full transition-all duration-300 ${insuranceType === type ? "border-black bg-black" : "border-gray-400 bg-white dark:bg-gray-700"}`}>{insuranceType === type && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                                <div className="flex flex-row items-center gap-3">
                                    <span className="text-base font-medium">{type}</span>
                                    <button type="button" onClick={() => setInfoPopup(infoPopup === type ? null : type)}>
                                        <Info size={16} className="text-gray-500 hover:text-black dark:hover:text-white" />
                                    </button>
                                </div>
                            </label>
                        ))}
                        {infoPopup && (
                            <Card className="absolute left-2 p-4 w-72 shadow-lg z-10 bg-white dark:bg-gray-800 border rounded-lg" onClose={() => setInfoPopup(null)}>
                                <CardContent>
                                    <div className="font-medium text-lg mb-2">{infoPopup}</div>
                                    <div className="text-sm text-gray-600">{insuranceDetails[infoPopup].description}</div>
                                    {insuranceDetails[infoPopup].excess && <div className="text-sm text-gray-600 mt-1">{insuranceDetails[infoPopup].excess}</div>}
                                    <div className="text-sm font-semibold mt-2">{insuranceDetails[infoPopup].price}</div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>



                <hr className="mt-6" />
                <div className="mt-6 flex flex-row items-center justify-between font-bold text-base">
                    <div>Total</div>
                    <div>AU$ {totalFees}</div>
                </div>
            </div>
            <hr />
            <div className="p-4">
                <Button
                    disabled={disabled}
                    label="Continue"
                    onClick={() => {
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
