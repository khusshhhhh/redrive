import Link from "next/link";
import getCurrentUser from "../actions/getCurrentUser";
import getReservations from "../actions/getReservations";
import ReservationsClient from "./ReservationsClient";
import Container from "../components/Container";
import Illustration, { type IllustrationName } from "../components/Illustration";
import SignInLink from "../components/auth/SignInLink";

// Per-user hosting reservations — always rendered per request.
export const dynamic = "force-dynamic";

const ReservationsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <EmptyReservations
                illustration="signed-out"
                title="Sign in to view reservations"
                copy="Your hosting requests and booking details will appear here."
                signIn
            />
        );
    }

    const { reservations, nextCursor } = await getReservations({
        authorId: currentUser.id
    });

    if (reservations.length === 0) {
        return (
            <EmptyReservations
                illustration="road-trip"
                title="No reservations yet"
                copy="New booking requests for your vehicles will appear here. List a vehicle to start getting them."
                cta={{ href: "/properties", label: "Manage your vehicles" }}
            />
        );
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

function EmptyReservations({
    title,
    copy,
    illustration,
    cta,
    signIn,
}: {
    title: string;
    copy: string;
    illustration: IllustrationName;
    cta?: { href: string; label: string };
    signIn?: boolean;
}) {
    return (
        <main className="bg-surface-soft/40 py-16 sm:py-24">
            <Container>
                <div className="mx-auto max-w-xl rounded-md border border-hairline-soft bg-white p-8 text-center shadow-card sm:p-12">
                    <Illustration name={illustration} width={200} className="mx-auto mb-5 h-auto w-[180px]" priority />
                    <h1 className="text-2xl font-semibold text-ink">{title}</h1>
                    <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
                    {signIn && <SignInLink redirectTo="/reservations" />}
                    {cta && (
                        <Link
                            href={cta.href}
                            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                            {cta.label}
                        </Link>
                    )}
                </div>
            </Container>
        </main>
    );
}
