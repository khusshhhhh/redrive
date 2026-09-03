import getCurrentUser from "../actions/getCurrentUser";
import getReservations from "../actions/getReservations";
import ReservationsClient from "./ReservationsClient";
import Container from "../components/Container";
import { CalendarDays } from "lucide-react";

// Per-user hosting reservations — always rendered per request.
export const dynamic = "force-dynamic";

const ReservationsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return <EmptyReservations title="Sign in to view reservations" copy="Your hosting requests and booking details will appear here." />;
    }

    const { reservations, nextCursor } = await getReservations({
        authorId: currentUser.id
    });

    if (reservations.length === 0) {
        return <EmptyReservations title="No reservations yet" copy="New booking requests for your vehicles will appear here." />;
    }

    return (
        <ReservationsClient
            reservations={reservations}
            currentUser={currentUser}
            nextCursor={nextCursor}
            role="host"
        />
    );

};

export default ReservationsPage;

function EmptyReservations({ title, copy }: { title: string; copy: string }) {
    return <main className="bg-surface-soft/40 py-16 sm:py-24"><Container><div className="mx-auto max-w-xl rounded-md border border-hairline-soft bg-white p-8 text-center shadow-card sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft text-primary"><CalendarDays size={28} /></div><h1 className="mt-5 text-2xl font-semibold text-ink">{title}</h1><p className="mt-2 text-sm leading-6 text-muted">{copy}</p></div></Container></main>;
}
