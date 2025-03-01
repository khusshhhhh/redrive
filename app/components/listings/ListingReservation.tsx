'use client';

import { Range } from 'react-date-range';
import Calendar from '../inputs/Calender';
import Button from '../Button';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

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
    price,
    dateRange,
    totalPrice,
    onChangeDate,
    onSubmit,
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


    const handleInsuranceChange = (type: string, fee: number) => {
        setInsuranceType(type);
        setInsuranceFee(fee * dayCount);
    };

    const totalFees = totalPrice + redriveFee + serviceFee + insuranceFee; // ✅ Include insurance cost

    return (
        <div className="bg-white shadow-md shadow-gray-600/30 rounded-xl border-[1px] border-neutral-200 overflow-hidden mt-10 md:mt-0">
            <div className="flex flex-row items-center gap-1 p-4">
                <div className="text-2xl font-semibold">$ {price}</div>
                <div className="font-light text-neutral-600">per day</div>
            </div>
            <hr />
            <Calendar value={dateRange} disabledDates={disabledDates} onChange={(value) => onChangeDate(value.selection)} />
            <hr />
            <div className="p-4 flex flex-col">
                <div className='font-bold mb-4'>Basic Pricing</div>
                <div className="flex flex-row items-center justify-between font-normal text-base">
                    <div>Reservation Cost</div>
                    <div className="font-bold">AU$ {totalPrice}</div>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between font-normal text-base">
                    <div>Service Fee</div>
                    <div className="font-bold">AU$ {serviceFee}</div>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between font-normal text-base">
                    <div>Redrive Fees</div>
                    <div className="font-bold">AU$ {redriveFee}</div>
                </div>
                <hr className="mt-4" />

                {/* ✅ Styled Insurance Options */}
                <div className="mt-4">
                    <div className="font-bold mb-4">Insurance Options</div>
                    <div className="flex flex-col space-y-3">
                        {/* Risk Taker */}
                        <label className="flex items-start space-x-3 cursor-pointer transition-all duration-300 hover:border-black">
                            <input
                                type="radio"
                                name="insurance"
                                value="Risk Taker"
                                checked={insuranceType === "Risk Taker"}
                                onChange={() => handleInsuranceChange("Risk Taker", 20)}
                                className="hidden" // Hide the default radio button
                            />
                            <div className={`mt-1 w-4 h-4 flex justify-center items-center border-2 rounded-full transition-all duration-300 ${insuranceType === "Risk Taker" ? "border-black bg-black" : "border-gray-400 bg-white"
                                }`}>
                                {insuranceType === "Risk Taker" && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-medium">Risk Taker - AU$ 20/day</span>
                                <span className="text-sm text-gray-500">
                                    Covers minor damages but has a higher liability.
                                </span>
                                <span className='text-sm text-gray-500'>Excess of AU$ 4000 applies. </span>
                            </div>
                        </label>

                        {/* Happy Driver */}
                        <label className="flex items-start space-x-3 cursor-pointer transition-all duration-300 hover:border-black">
                            <input
                                type="radio"
                                name="insurance"
                                value="Happy Driver"
                                checked={insuranceType === "Happy Driver"}
                                onChange={() => handleInsuranceChange("Happy Driver", 40)}
                                className="hidden" // Hide the default radio button
                            />
                            <div className={`mt-1 w-4 h-4 flex justify-center items-center border-2 rounded-full transition-all duration-300 ${insuranceType === "Happy Driver" ? "border-black bg-black" : "border-gray-400 bg-white"
                                }`}>
                                {insuranceType === "Happy Driver" && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-medium">Happy Driver - AU$ 40/day</span>
                                <span className="text-sm text-gray-500">
                                    Full coverage for damages and reduced liability.
                                </span>
                                <span className="text-sm text-gray-500">
                                    Excess of AU$ 500 applies.
                                </span>
                            </div>
                        </label>

                        {/* No Insurance */}
                        <label className="flex items-start space-x-3 cursor-pointer transition-all duration-300 hover:border-black">
                            <input
                                type="radio"
                                name="insurance"
                                value="No Insurance"
                                checked={insuranceType === "No Insurance"}
                                onChange={() => handleInsuranceChange("No Insurance", 0)}
                                className="hidden" // Hide the default radio button
                            />
                            <div className={`mt-1 w-4 h-4 flex justify-center items-center border-2 rounded-full transition-all duration-300 ${insuranceType === "No Insurance" ? "border-black bg-black" : "border-gray-400 bg-white"
                                }`}>
                                {insuranceType === "No Insurance" && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-medium">No Insurance</span>
                                <span className="text-sm text-gray-500">
                                    You are responsible for all damages.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>



                <hr className="mt-4" />
                <div className="mt-3 flex flex-row items-center justify-between font-bold text-base">
                    <div>Total</div>
                    <div>AU$ {totalFees}</div>
                </div>
            </div>
            <hr />
            <div className="pl-0 pt-0 pr-8 pb-0">
                <Button disabled={disabled} label="Book" onClick={async () => onSubmit(insuranceType, insuranceFee)} />
            </div>
        </div>
    );
};

export default ListingReservation;
