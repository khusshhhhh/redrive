"use client";

import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import { SafeReservation, SafeUser } from "../types";
import { useCallback, useState } from "react";
import ListingCard from "../components/listings/ListingCard";
import CancelBookingDialog from "../components/reservations/CancelBookingDialog";
import { calculateCancellationOutcome } from "../libs/cancellationPolicy";

interface TripsClientProps {
    reservations: SafeReservation[];
    currentUser?: SafeUser | null;
}

const TripsClient: React.FC<TripsClientProps> = ({ reservations, currentUser }) => {
    const router = useRouter();
    const [cancelTarget, setCancelTarget] = useState<SafeReservation | null>(null);

    const onCancel = useCallback((reservation: SafeReservation) => {
        setCancelTarget(reservation);
    }, []);

    const handleReviewRedirect = useCallback((reservationId: string) => {
        router.push(`/review/${reservationId}`);
    }, [router]);

    return (
        <Container>
          <div className="py-6 sm:py-10">
            <Heading title="Bookings" subtitle="Your booked trips and history!" />
            <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {reservations.map((reservation) => {
                    const today = new Date();
                    const reservationStartDate = new Date(reservation.startDate);
                    const reservationEndDate = new Date(reservation.endDate);

                    // Ensure the review button appears only after 1 full day has passed
                    const oneDayAfterEnd = new Date(reservationEndDate);
                    oneDayAfterEnd.setDate(oneDayAfterEnd.getDate() + 1);

                    const canReview = reservation.status === "COMPLETED" && today >= oneDayAfterEnd;
                    const cancellation = calculateCancellationOutcome({ policy: reservation.cancellationPolicy, pickupAt: reservationStartDate, cancelledAt: today });
                    const canCancel = ["REVIEWING", "APPROVED"].includes(reservation.status) && cancellation.canCancel;
                    const hasPaid = ["PAID_HELD", "RELEASED"].includes(reservation.paymentStatus || "");

                    return (
                        <ListingCard
                            key={reservation.id}
                            data={reservation.listing}
                            reservation={reservation}
                            detailHref={`/reservations/${reservation.id}`}
                            actionId={reservation.id}
                            onAction={
                                canReview
                                    ? () => handleReviewRedirect(reservation.id)
                                    : canCancel
                                        ? () => onCancel(reservation)
                                        : undefined // No action if cancellation is not allowed
                            }
                            disabled={!canCancel && !canReview}
                            actionLabel={canReview ? "Review booking" : canCancel ? hasPaid ? `Cancel · ${cancellation.refundPercentage}% refund` : "Cancel request" : undefined}
                            currentUser={currentUser}
                            compact
                        />
                    );
                })}
            </div>
          </div>
          <CancelBookingDialog
            reservation={cancelTarget}
            role="GUEST"
            open={cancelTarget !== null}
            onClose={() => setCancelTarget(null)}
            onCancelled={() => router.refresh()}
          />
        </Container>
    );
};

export default TripsClient;
