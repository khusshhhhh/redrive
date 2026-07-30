'use client';

import { useCallback, useState } from "react";
import { SafeReservation, SafeUser } from "../types";
import { useRouter } from "next/navigation";
import Container from "../components/Container";
import Heading from "../components/Heading";
import toast from "react-hot-toast";
import axios from "axios";
import ListingCard from "../components/listings/ListingCard";

interface ReservationsClientProps {
    reservations: SafeReservation[];
    currentUser?: SafeUser | null;
}

const ReservationsClient: React.FC<ReservationsClientProps> = ({
    reservations,
    currentUser
}) => {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState('');

    const onCancel = useCallback((id: string) => {
        setDeletingId(id);

        axios.delete(`/api/reservations/${id}`)
            .then(() => {
                toast.success("Reservation cancelled");
                router.refresh();
            })
            .catch(() => {
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setDeletingId('');
            });
    }, [router]);


    return (
        <Container>
            <Heading
                title="Reservations"
                subtitle="Bookings on your utilities"
            />
            <div className="px-2
                      z-9
                      pt-8
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      md:grid-cols-3
                      lg:grid-cols-4
                      gap-8">
                {reservations.map((reservation) => (
                    <div key={reservation.id} className="flex flex-col">
                        <ListingCard
                            key={reservation.id}
                            data={reservation.listing}
                            reservation={reservation}
                            actionId={reservation.id}
                            onAction={onCancel}
                            disabled={deletingId === reservation.id}
                            actionLabel="Cancel reservation"
                            currentUser={currentUser}
                        />
                        <button
                            onClick={() => router.push(`/reservations/${reservation.id}`)}
                            className="font-medium mt-2 bg-white text-ink px-4 py-2 border border-ink rounded-sm hover:bg-ink hover:text-white transition"
                        >
                            View reservation
                        </button>
                    </div>
                ))}
            </div>

        </Container>
    );
};

export default ReservationsClient;
