'use client';

import { Range } from 'react-date-range';
import Calendar from '../inputs/Calender';
import Button from '../Button';

const calculateServiceFee = (totalPrice: number): number => {
    if (totalPrice <= 200) return 10;
    if (totalPrice <= 400) return 25;
    if (totalPrice <= 800) return 40;
    if (totalPrice <= 1200) return 60;
    if (totalPrice <= 2000) return 80;
    return 100;
};

interface ListingReservationProps {
    price: number;
    dateRange: Range;
    totalPrice: number;
    totalFees: number;
    serviceFee: number; //New Fee added
    onChangeDate: (value: Range) => void;
    onSubmit: () => void;
    disabled?: boolean;
    disabledDates: Date[];
}

const ListingReservation: React.FC<ListingReservationProps> = ({
    price,
    dateRange,
    totalPrice,
    onChangeDate,
    onSubmit,
    disabled,
    disabledDates
}) => {
    const redriveFee = Math.round(totalPrice * 0.08);
    const serviceFee = calculateServiceFee(totalPrice);
    const totalFees = totalPrice + redriveFee + serviceFee; // ✅ Updated total fee calculation

    return (
        <div className="bg-white rounded-xl border-[1px] border-neutral-200 overflow-hidden">
            <div className="flex flex-row items-center gap-1 p-4">
                <div className="text-2xl font-semibold">$ {price}</div>
                <div className="font-light text-neutral-600">per day</div>
            </div>
            <hr />
            <Calendar value={dateRange} disabledDates={disabledDates} onChange={(value) => onChangeDate(value.selection)} />
            <hr />
            <div className="p-4 flex flex-col">
                <div className="flex flex-row items-center justify-between font-normal text-base">
                    <div>Reservation Cost</div>
                    <div className="font-bold">$ {totalPrice}</div>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between font-normal text-base">
                    <div>Service Fee</div>
                    <div className="font-bold">$ {serviceFee}</div>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between font-normal text-base">
                    <div>Redrive Fees</div>
                    <div className="font-bold">$ {redriveFee}</div>
                </div>
                <hr className="mt-4" />
                <div className="mt-3 flex flex-row items-center justify-between font-bold text-base">
                    <div>Total</div>
                    <div>$ {totalFees}</div>
                </div>
            </div>
            <hr />
            <div className="pl-0 pt-0 pr-8 pb-0">
                <Button disabled={disabled} label="Book" onClick={onSubmit} />
            </div>
        </div>
    );
};

export default ListingReservation;