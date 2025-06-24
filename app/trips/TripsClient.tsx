"use client";

import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import { SafeReservation, SafeUser } from "../types";
import { useCallback, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ListingCard from "../components/listings/ListingCard";

interface TripsClientProps {
    reservations: SafeReservation[];
    currentUser?: SafeUser | null;
}

const TripsClient: React.FC<TripsClientProps> = ({ reservations, currentUser }) => {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const onCancel = useCallback((id: string) => {
        setDeletingId(id);

        axios.delete(`/api/reservations/${id}`)
            .then(() => {
                toast.success("Reservation cancelled");
                router.refresh();
            })
            .catch((error) => {
                console.error("Cancel Error:", error);
                toast.error(error?.response?.data?.error || "Error canceling booking.");
            })
            .finally(() => {
                setDeletingId(null);
            });
    }, [router]);

    const handleReviewRedirect = useCallback((reservationId: string) => {
        router.push(`/review/${reservationId}`);
    }, [router]);

    return (
        <Container>
            <Heading title="Bookings" subtitle="Your booked trips and history!" />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6 gap-8">
                {reservations.map((reservation) => {
                    const today = new Date();
                    const reservationStartDate = new Date(reservation.startDate);
                    const reservationEndDate = new Date(reservation.endDate);

                    // Ensure the review button appears only after 1 full day has passed
                    const oneDayAfterEnd = new Date(reservationEndDate);
                    oneDayAfterEnd.setDate(oneDayAfterEnd.getDate() + 1);

                    const canReview = today >= oneDayAfterEnd;
                    const cancelDeadline = new Date(reservationStartDate);
                    cancelDeadline.setDate(cancelDeadline.getDate() - 2);
                    const canCancel = today < cancelDeadline; // Only allow canceling at least 2 days before start

                    return (
                        <ListingCard
                            key={reservation.id}
                            data={reservation.listing}
                            reservation={reservation}
                            actionId={reservation.id}
                            onAction={
                                canReview
                                    ? () => handleReviewRedirect(reservation.id)
                                    : canCancel
                                        ? () => onCancel(reservation.id)
                                        : undefined // No action if cancellation is not allowed
                            }
                            disabled={deletingId === reservation.id || !canCancel}
                            actionLabel={canReview ? "Review Booking" : canCancel ? "Cancel Booking" : "Cannot Cancel"}
                            currentUser={currentUser}
                        />
                    );
                })}
            </div>
        </Container>
    );
};

export default TripsClient;
