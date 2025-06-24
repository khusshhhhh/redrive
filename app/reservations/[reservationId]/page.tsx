"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation"; // ✅ Import useParams
import axios from "axios";
import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";
import { SafeReservation, SafeUser } from "@/app/types";
import toast from "react-hot-toast";
import { FaCheck } from "react-icons/fa";
import Image from "next/image";

const ReservationDetails = () => {
    const router = useRouter();
    const params = useParams(); // ✅ Get params using useParams()
    const { reservationId } = params as { reservationId: string }; // ✅ Extract reservationId properly

    const [reservation, setReservation] = useState<SafeReservation | null>(null);
    const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/auth/user')
            .then(res => setCurrentUser(res.data))
            .catch(() => setCurrentUser(null));
    }, []);

    useEffect(() => {
        if (!reservationId) return; // ✅ Prevent running request if reservationId is undefined

        axios.get(`/api/reservations/${reservationId}`)
            .then((response) => {
                setReservation(response.data);
            })
            .catch(() => {
                toast.error("Failed to load reservation details.");
                router.push("/reservations");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [reservationId, router]);

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto py-8 animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-40 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
            </div>
        );
    }

    if (!reservation) {
        return <p className="text-center text-red-500">Reservation not found.</p>;
    }

    const otherUserId = currentUser?.id === reservation.user.id ? reservation.listing.userId : reservation.user.id;

    const listing = reservation.listing;

    const startChat = async () => {
        try {
            const res = await axios.post('/api/chats', { userId: otherUserId });
            router.push(`/messages/${res.data.id}`);
        } catch {
            toast.error('Failed to start chat');
        }
    };

    const handleStatus = async (status: string) => {
        if (!reservation) return;
        try {
            const res = await axios.patch(`/api/reservations/${reservation.id}`, { status });
            setReservation(res.data);
            toast.success(`Reservation ${status.toLowerCase()}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    return (
        <Container>
            <div className="max-w-3xl mx-auto py-8">
                <Heading title="Reservation Details" subtitle="Full booking details" />

                <div className="bg-white mt-6 flex flex-col gap-6">
                    <div className="p-6 border-[2px] rounded-xl border-gray-200">
                        <h2 className="text-xl font-semibold">{listing.title}</h2>
                        <div className="mt-4 flex flex-col md:flex-row gap-6">
                            <Image
                                src={listing.imageSrcs?.[0] || "/images/placeholder.png"}
                                alt={listing.title}
                                width={320}
                                height={220}
                                className="rounded-md object-cover"
                            />
                            <div className="flex flex-col gap-2 text-gray-700 text-sm">
                                <p><span className="font-bold">Location:</span> {listing.suburb}, {listing.state}</p>
                                <p><span className="font-bold">Category:</span> {listing.category}</p>
                                <p><span className="font-bold">Build:</span> {listing.company} {listing.modal} ({listing.year})</p>
                                <p><span className="font-bold">Guests:</span> {listing.guestCount} &nbsp;|&nbsp; <span className="font-bold">Doors:</span> {listing.doorCount} &nbsp;|&nbsp; <span className="font-bold">Sleeps:</span> {listing.sleepCount}</p>
                                {listing.amenities && listing.amenities.length > 0 && (
                                    <p><span className="font-bold">Amenities:</span> {listing.amenities.join(', ')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-[2px] rounded-xl border-gray-200">
                        <h3 className="text-lg font-semibold">User Details</h3>
                        <div className="mt-4 flex flex-col">
                            <Image
                                src={reservation.user.image || "/images/placeholder.png"}
                                alt="User Profile"
                                width={80} // ✅ Define exact width to optimize performance
                                height={80} // ✅ Define exact height
                                className="rounded-md"
                                priority // ✅ Ensures fast loading (for above-the-fold content)
                            />
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                            <p className="text-gray-700"><span className="font-bold">Name: </span>{reservation.user.name || "N/A"}</p>
                            <p className="text-gray-700"><span className="font-bold">Email: </span>{reservation.user.email}</p>
                            <p className="text-gray-700"><span className="font-bold">Phone: </span>{reservation.user.number || "N/A"}</p>
                            <p className="text-gray-700"><span className="font-bold">Address: </span>{reservation.user.streetAddress || "N/A"}, {reservation.user.suburb}, {reservation.user.state}, {reservation.user.postcode}</p>
                        </div>
                        <div className="mt-4">
                            {reservation.user?.profileVerified === "Y" && (
                                <div className="text-teal-500 flex items-center gap-2">
                                    Verified User <FaCheck className="text-teal-500" size={18} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-6 border-[2px] rounded-xl border-gray-200">
                        <h3 className="text-lg font-semibold">Booking Period:</h3>
                        <div className="mt-4 flex flex-col gap-3">
                            <p className="text-gray-700"><span className="font-bold">From: </span>{new Date(reservation.startDate).toDateString()}</p>
                            <p className="text-gray-700"><span className="font-bold">To: </span>{new Date(reservation.endDate).toDateString()}</p>
                        </div>
                    </div>
                    <div className="p-6 border-[2px] rounded-xl border-gray-200">
                        <h3 className="text-lg font-semibold">Cost Breakdown</h3>
                        <div className="mt-4 flex flex-col gap-2 text-sm text-gray-700">
                            <p><span className="font-bold">Reservation Cost:</span> AU${reservation.totalPrice}</p>
                            <p><span className="font-bold">Service Fee:</span> AU${reservation.serviceFee}</p>
                            <p><span className="font-bold">Redrive Fee:</span> AU${reservation.redriveFee}</p>
                            <p><span className="font-bold">Insurance ({reservation.insuranceType}):</span> AU${reservation.insuranceFee}</p>
                            {listing.cleaningFeeOption === 'YES' && (
                                <p><span className="font-bold">Cleaning Fee:</span> AU${listing.cleaningFeeAmount}</p>
                            )}
                            {listing.cleaningFeeOption === 'UPON_RETURNING' && (
                                <p><span className="font-bold">Return Cleaning Fee:</span> AU${listing.returnCleaningFeeAmount}</p>
                            )}
                            <hr className="my-2" />
                            <p className="font-semibold"><span className="font-bold">Total:</span> AU${reservation.totalFees}</p>
                            <p className="font-semibold mt-2">Status: {reservation.status}</p>
                            {currentUser?.id === listing.userId && reservation.status === "REVIEWING" && (
                                <div className="flex gap-3 mt-2">
                                    <button
                                        onClick={() => handleStatus('APPROVED')}
                                        className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleStatus('DECLINED')}
                                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
                                    >
                                        Decline
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="items-center justify-center flex gap-4">
                        <button
                            onClick={startChat}
                            className="bg-teal-500 text-white px-4 py-3 rounded-md hover:bg-teal-600 transition"
                        >
                            Message
                        </button>
                        <button
                            onClick={() => router.push("/reservations")}
                            className="bg-white text-teal-500 px-16 py-3 rounded-md hover:bg-teal-500 hover:text-white border-[2px] border-teal-500 transition"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default ReservationDetails;
