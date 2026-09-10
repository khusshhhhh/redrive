'use client';

import { PublicHost, SafeListing, SafeUser } from "@/app/types";
import { categories } from "@/app/components/navbar/Categories";
import { useEffect, useMemo, useState } from "react";
import Container from "@/app/components/Container";
import ListingHead from "@/app/components/listings/ListingHead";
import ListingInfo from "@/app/components/listings/ListingInfo";
import { differenceInCalendarDays, eachDayOfInterval } from "date-fns";
import useLoginModal from "@/app/hooks/useLoginModal";
import ListingReservation from "@/app/components/listings/ListingReservation";
import { Range } from "react-date-range";
import Reviews from "@/app/components/reviews/Reviews";
import useRecentlyViewed from "@/app/hooks/useRecentlyViewed";
import { guestDailyPrice } from "@/app/libs/pricing";

const initialDateRange = {
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
};

interface ListingClientProps {
    reservations?: Array<{ id: string; startDate: string; endDate: string; status: string }>;
    listing: SafeListing & {
        user: PublicHost;
        amenities?: string[];
        state: string;
        suburb: string;
    };
    currentUser?: SafeUser | null;
}

const ListingClient: React.FC<ListingClientProps> = ({
    listing,
    reservations = [],
    currentUser
}) => {
    const loginModal = useLoginModal();
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

    const [dateRange, setDateRange] = useState<Range>(initialDateRange);

    // The all-in daily price a guest sees (host rate + Redrive's margin).
    const dailyPrice = guestDailyPrice(listing.price);
    const dayCount = dateRange.startDate && dateRange.endDate
        ? differenceInCalendarDays(dateRange.endDate, dateRange.startDate) + 1
        : 1;
    const upfrontCleaning = listing.cleaningFeeOption === 'YES' ? (listing.cleaningFeeAmount || 0) : 0;
    const estimatedTotal = dailyPrice * dayCount + upfrontCleaning;

    // Disable booking actions if the viewer is the listing owner
    const isOwner = currentUser?.id === listing.userId;

    const scrollToBooking = () => {
        document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

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
                    <div className="mt-1 grid grid-cols-1 md:mt-8 md:grid-cols-3 md:gap-12">
                        <div className="md:col-span-2">
                            <ListingInfo
                                listingId={listing.id}
                                listing={listing}
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
                                cancellationPolicy={listing.cancellationPolicy}
                                address={`${listing.suburb}, ${listing.state}`}
                                amenities={listing.amenities} state={listing.state} suburb={listing.suburb} />
                        </div>
                        <div id="booking-panel" className="order-last mb-10 scroll-mt-36 md:order-last md:col-span-1">
                            <div className="md:sticky md:top-28">
                                <ListingReservation
                                    listing={listing}
                                    onChangeDate={(value) => setDateRange(value)}
                                    dateRange={dateRange}
                                    disabled={isOwner}
                                    disabledDates={disabledDates}
                                    currentUser={currentUser}
                                    onRequireLogin={loginModal.onOpen}
                                />
                            </div>
                        </div>
                    </div>
                    <Reviews listingId={listing.id} canRespond={isOwner} />
                </div>
            </div>
            {!isOwner && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(22,22,22,0.10)] backdrop-blur md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                    <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
                        <div className="min-w-0"><div className="text-base font-semibold text-ink">AU${Math.round(estimatedTotal)} <span className="text-xs font-normal text-muted">estimated total</span></div><div className="truncate text-xs text-muted">AU${dailyPrice}/day · {listing.suburb}, {listing.state}</div></div>
                        <button type="button" onClick={scrollToBooking} className="h-12 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Check availability</button>
                    </div>
                </div>
            )}
        </Container>
    );
};

export default ListingClient;
