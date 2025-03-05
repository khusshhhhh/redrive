'use client';

import { SafeListing, SafeUser, SafeReservation } from "@/app/types";
import { categories } from "@/app/components/navbar/Categories";
import { useCallback, useEffect, useMemo, useState } from "react";
import Container from "@/app/components/Container";
import ListingHead from "@/app/components/listings/ListingHead";
import ListingInfo from "@/app/components/listings/ListingInfo";
import useLoginModal from "@/app/hooks/useLoginModal";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import axios from "axios";
import toast from "react-hot-toast";
import ListingReservation from "@/app/components/listings/ListingReservation";
import { Range } from "react-date-range";
import Reviews from "@/app/components/reviews/Reviews";

const initialDateRange = {
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
};

interface ListingClientProps {
    reservations?: SafeReservation[];
    listing: SafeListing & {
        user: SafeUser;
        amenities?: string[];
        state: string;
        suburb: string;
        // address: string;
    };
    currentUser?: SafeUser | null;
}

const ListingClient: React.FC<ListingClientProps> = ({
    listing,
    reservations = [],
    currentUser
}) => {
    const loginModal = useLoginModal();
    const router = useRouter();

    const disabledDates = useMemo(() => {
        let dates: Date[] = [];

        reservations.forEach((reservation) => {
            const range = eachDayOfInterval({
                start: new Date(reservation.startDate),
                end: new Date(reservation.endDate)
            });

            dates = [...dates, ...range];
        });

        return dates;
    }, [reservations]);

    const [isLoading, setIsLoading] = useState(false);
    const [totalPrice, setTotalPrice] = useState(listing.price);
    const [totalFees, setTotalFees] = useState(listing.price * 1.08); // Including Redrive Fee (6%)
    const [dateRange, setDateRange] = useState<Range>(initialDateRange);
    const [insuranceType, setInsuranceType] = useState("No Insurance"); // ✅ Default to No Insurance
    const [insuranceFee, setInsuranceFee] = useState(0); // ✅ Default fee is 0


    const onCreateReservation = useCallback((insuranceType: string, insuranceFee: number) => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        setIsLoading(true);

        axios.post('/api/reservations', {
            listingId: listing?.id,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            totalPrice,
            totalFees,
            insuranceType, // ✅ Now properly passed
            insuranceFee,  // ✅ Now properly passed
        })
            .then(() => {
                toast.success('Listing reserved!');
                setDateRange(initialDateRange);
                router.push('/trips');
            })
            .catch((error) => {
                console.error("Reservation API error:", error.response?.data || error);
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setIsLoading(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        totalPrice,
        totalFees,
        insuranceType,  // ✅ Include insuranceType
        insuranceFee,   // ✅ Include insuranceFee
        dateRange,
        listing?.id,
        router,
        currentUser,
        loginModal
    ]);


    const calculateServiceFee = (totalPrice: number): number => {
        if (totalPrice <= 200) return 10;
        if (totalPrice <= 400) return 25;
        if (totalPrice <= 800) return 40;
        if (totalPrice <= 1200) return 60;
        if (totalPrice <= 2000) return 80;
        return 100;
    };

    useEffect(() => {
        if (dateRange.startDate && dateRange.endDate) {
            const dayCount = differenceInCalendarDays(dateRange.endDate, dateRange.startDate);

            if (dayCount && listing.price) {
                const newTotalPrice = (dayCount + 1) * listing.price;
                const newRedriveFee = Math.round(newTotalPrice * 0.08);
                const newServiceFee = calculateServiceFee(newTotalPrice);

                setTotalPrice(newTotalPrice);
                setTotalFees(newTotalPrice + newRedriveFee + newServiceFee); // ✅ Update total fees
            } else {
                setTotalPrice(listing.price);
                setTotalFees(listing.price * 1.08);
            }
        }
    }, [dateRange, listing.price]);

    const category = useMemo(() => {
        return categories.find((item) => item.label === listing.category) || {
            icon: () => null,
            label: "Unknown",
            description: "",
        };
    }, [listing.category]);

    return (
        <Container>
            <div className="max-w-screen-2xl px-4 mx-auto md:mx-10">
                <div className="flex flex-col gap-6">
                    <ListingHead
                        title={listing.title}
                        imageSrcs={listing.imageSrcs}
                        id={listing.id}
                        currentUser={currentUser}
                    // address={`${listing.address}, ${listing.suburb}, ${listing.state}`}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
                        <ListingInfo
                            user={listing.user}
                            category={category}
                            description={listing.description}
                            information={listing.information || ''}
                            modal={listing.modal}
                            company={listing.company}
                            year={listing.year}
                            doorCount={listing.doorCount}
                            guestCount={listing.guestCount}
                            sleepCount={listing.sleepCount}
                            // ✅ Replace locationValue with formatted address
                            address={`${listing.suburb}, ${listing.state}`}
                            amenities={listing.amenities} state={""} suburb={""} />
                        <div className="order-last mb-10 md:order-last md:col-span-3">
                            <ListingReservation
                                listing={listing}
                                price={listing.price}
                                serviceFee={calculateServiceFee(totalPrice)}
                                totalPrice={totalPrice}
                                totalFees={totalFees}
                                onChangeDate={(value) => setDateRange(value)}
                                dateRange={dateRange}
                                onSubmit={onCreateReservation}
                                disabled={isLoading}
                                disabledDates={disabledDates}
                                insuranceType={insuranceType} // ✅ Add insurance state
                                setInsuranceType={setInsuranceType} // ✅ Allow user to update it
                                insuranceFee={insuranceFee} // ✅ Add insurance fee state
                                setInsuranceFee={setInsuranceFee} // ✅ Allow updates
                            />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div>
                            <div className="font-bold text-lg">Reviews</div>
                        </div>
                        <div className="mt-6">
                            <Reviews listingId={listing.id} />
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default ListingClient;
