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
    const [deletingId, setDeletingId] = useState('');

    const onCancel = useCallback((id: string) => {
        setDeletingId(id);

        axios.delete(`/api/reservations/${id}`)
            .then(() => {
                toast.success('Reservation cancelled');
                router.refresh();
            })
            .catch((error) => {
                toast.error(error?.response?.data?.error || "Error canceling booking.");
            })
            .finally(() => {
                setDeletingId('');
            });
    }, [router]);

    const handleReviewRedirect = useCallback((reservationId: string) => {
        router.push(`/review/${reservationId}`);
    }, [router]);

    return (
        <Container>
            <Heading title="Bookings" subtitle="Your booked trips and history!" />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
                {reservations.map((reservation) => {
                    const today = new Date();
                    const reservationEndDate = new Date(reservation.endDate);
                    const isPastReservation = today > reservationEndDate;

                    return (
                        <ListingCard
                            key={reservation.id}
                            data={reservation.listing}
                            reservation={reservation}
                            actionId={reservation.id}
                            onAction={
                                isPastReservation
                                    ? () => handleReviewRedirect(reservation.id)
                                    : () => onCancel(reservation.id)
                            }
                            disabled={deletingId === reservation.id}
                            actionLabel={isPastReservation ? "Review Booking" : "Cancel Booking"}
                            currentUser={currentUser}
                        />
                    );
                })}
            </div>
        </Container>
    );
};

export default TripsClient;
