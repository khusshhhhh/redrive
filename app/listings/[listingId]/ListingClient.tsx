'use client';

import { PublicHost, SafeListing, SafeUser, SafeReservation } from "@/app/types";
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
import { IconUserCheck } from "@tabler/icons-react";
import useRecentlyViewed from "@/app/hooks/useRecentlyViewed";

const initialDateRange = {
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
};

interface ListingClientProps {
    reservations?: SafeReservation[];
    listing: SafeListing & {
        user: PublicHost;
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
    const { addRecentlyViewed } = useRecentlyViewed();

    useEffect(() => {
        addRecentlyViewed(listing.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listing.id]);

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
    const initialFees = listing.price * 1.08 + (listing.cleaningFeeOption === 'YES' ? (listing.cleaningFeeAmount || 0) : 0);
    const [totalFees, setTotalFees] = useState(initialFees);
    const [dateRange, setDateRange] = useState<Range>(initialDateRange);
    const [insuranceType, setInsuranceType] = useState("No Insurance"); // ✅ Default to No Insurance
    const [insuranceFee, setInsuranceFee] = useState(0); // ✅ Default fee is 0

    // Disable booking actions if the viewer is the listing owner
    const isOwner = currentUser?.id === listing.userId;

    const scrollToBooking = () => {
        document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };


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
            insuranceFee, // ✅ Now properly passed
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
        insuranceType, // ✅ Include insuranceType
        insuranceFee, // ✅ Include insuranceFee
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
                const cleaning = listing.cleaningFeeOption === 'YES' ? (listing.cleaningFeeAmount || 0) : 0;
                setTotalFees(newTotalPrice + newRedriveFee + newServiceFee + cleaning); // include cleaning fee
            } else {
                setTotalPrice(listing.price);
                const cleaning = listing.cleaningFeeOption === 'YES' ? (listing.cleaningFeeAmount || 0) : 0;
                setTotalFees(listing.price * 1.08 + cleaning);
            }
        }
    }, [dateRange, listing.price, listing.cleaningFeeOption, listing.cleaningFeeAmount]);

    const category = useMemo(() => {
        return categories.find((item) => item.label === listing.category) || {
            icon: () => null,
            label: "Unknown",
            description: "",
        };
    }, [listing.category]);

    return (
        <Container>
            <div className="mx-auto max-w-[1080px] pb-28 pt-4 sm:pt-8 md:pb-0">
                <div className="flex flex-col gap-6">
                    <ListingHead
                        title={listing.title}
                        imageSrcs={listing.imageSrcs}
                        id={listing.id}
                        currentUser={currentUser}
                    />
                    <div className="mt-1 grid grid-cols-1 md:mt-6 md:grid-cols-3 md:gap-10">
                        <div className="md:col-span-2">
                            <ListingInfo
                                listingId={listing.id}
                                user={listing.user}
                                currentUser={currentUser}
                                category={category}
                                description={listing.description}
                                information={listing.information || ''}
                                modal={listing.modal}
                                company={listing.company}
                                year={listing.year}
                                doorCount={listing.doorCount}
                                guestCount={listing.guestCount}
                                sleepCount={listing.sleepCount}
                                fuelEconomy={listing.fuelEconomy}
                                driveChain={listing.driveChain}
                                // ✅ Replace locationValue with formatted address
                                address={`${listing.suburb}, ${listing.state}`}
                                amenities={listing.amenities} state={listing.state} suburb={listing.suburb} />
                        </div>
                        <div id="booking-panel" className="order-last mb-10 scroll-mt-36 md:order-last md:col-span-1">
                            <div className="md:sticky md:top-28">
                                <ListingReservation
                                    listing={listing}
                                    price={listing.price}
                                    serviceFee={calculateServiceFee(totalPrice)}
                                    totalPrice={totalPrice}
                                    totalFees={totalFees}
                                    onChangeDate={(value) => setDateRange(value)}
                                    dateRange={dateRange}
                                    onSubmit={onCreateReservation}
                                    disabled={isLoading || isOwner}
                                    disabledDates={disabledDates}
                                    insuranceType={insuranceType} // ✅ Add insurance state
                                    setInsuranceType={setInsuranceType} // ✅ Allow user to update it
                                    insuranceFee={insuranceFee} // ✅ Add insurance fee state
                                    setInsuranceFee={setInsuranceFee} // ✅ Allow updates
                                    currentUser={currentUser}
                                    onRequireLogin={loginModal.onOpen}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex flex-row gap-3 items-center text-ink">
                            <IconUserCheck size={18} />
                            <div className="text-display-sm font-semibold">Reviews</div>
                        </div>
                        <div className="mt-6">
                            <Reviews listingId={listing.id} />
                        </div>
                    </div>
                </div>
            </div>
            {!isOwner && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(24,54,58,0.10)] backdrop-blur md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                    <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
                        <div className="min-w-0"><div className="text-base font-semibold text-ink">AU${listing.price} <span className="text-xs font-normal text-muted">per day</span></div><div className="truncate text-xs text-muted">{listing.suburb}, {listing.state}</div></div>
                        <button type="button" onClick={scrollToBooking} className="h-12 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Check availability</button>
                    </div>
                </div>
            )}
        </Container>
    );
};

export default ListingClient;
