'use client';

import { Range } from 'react-date-range';
import Calendar from '../inputs/Calender';
import Button from '../Button';

interface ListingReservationProps {
    price: number;
    dateRange: Range;
    totalPrice: number;
    totalFees: number;
    onChangeDate: (value: Range) => void;
    onSubmit: () => void;
    disabled?: boolean;
    disabledDates: Date[];
}

const ListingReservation: React.FC<ListingReservationProps> = ({
    price,
    dateRange,
    totalPrice,
    totalFees,
    onChangeDate,
    onSubmit,
    disabled,
    disabledDates
}) => {
    const redriveFee = totalPrice * (6 / 100);
    return (
        <div
            className="bg-white rounded-xl border-[1px] border-neutral-200 overflow-hidden">
            <div
                className="flex flex-row items-center gap-1 p-4">
                <div className="text-2xl font-semibold">
                    $ {price}
                </div>
                <div className="font-light text-neutral-600">
                    per day
                </div>
            </div>
            <hr />
            <Calendar
                value={dateRange}
                disabledDates={disabledDates}
                onChange={(value) => onChangeDate(value.selection)}
            />
            <hr />
            <div className="p-4 flex flex-col gap-0">
                <div className="flex flex-row items-center justify-between font-normal text-base">
                    <div>Reservation Cost</div>
                    <div>$ {totalPrice}</div>
                </div>
                <div className="flex flex-row items-center justify-between font-normal text-base">
                    <div>Redrive Fees</div>
                    <div>$ {Math.round(redriveFee)}</div>
                </div>
                <hr className="mt-4" />
                <div className="mt-3 flex flex-row items-center justify-between font-bold text-base">
                    <div>Total</div>
                    <div>$ {Math.round(totalFees)}</div>
                </div>
            </div>
            <hr />
            <div className='pl-0 pt-0 pr-8 pb-0'>
                <Button
                    disabled={disabled}
                    label='Book'
                    onClick={onSubmit} />
            </div>
        </div>
    );
};

export default ListingReservation;