/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import Container from "@/app/components/Container";
import { toast, Toaster } from "react-hot-toast";

export default function ConfirmReservation() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Extract data from query params
    const listingId = searchParams.get("listingId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const totalPrice = searchParams.get("totalPrice");
    const totalFees = searchParams.get("totalFees");
    const insuranceType = searchParams.get("insuranceType");
    const insuranceFee = searchParams.get("insuranceFee");
    const cleaningFee = searchParams.get("cleaningFee");
    const returnCleaningFee = searchParams.get("returnCleaningFee");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [listing, setListing] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [host, setHost] = useState<any>(null);

    useEffect(() => {
        if (!listingId) return;

        // Fetch listing details from API
        axios.get(`/api/listings/${listingId}`)
            .then((response) => {
                setListing(response.data);
                setHost(response.data.user); // ✅ Store the host details separately
            })
            .catch((error) => {
                console.error("❌ Error fetching listing details:", error);
                toast.error("Failed to load listing details.");
            });
    }, [listingId]);

    const handleConfirmBooking = async () => {
        try {
            await axios.post("/api/reservations", {
                listingId,
                startDate,
                endDate,
                totalPrice: Number(totalPrice),
                totalFees: Number(totalFees),
                insuranceType,
                insuranceFee: Number(insuranceFee),
            });

            toast.success("Booking request sent!");
            router.push("/trips"); // ✅ Redirect user to "My Trips" page
        } catch (error) {
            console.error("❌ Error confirming booking:", error);
            toast.error("Error confirming booking. Please try again.");
        }
    };

    return (
        <Container>
            <Toaster />
            <div className="max-w-3xl mx-auto sm:max-w-xl rounded-lg">
                <h2 className="text-2xl font-semibold text-center mb-6 dark:text-neutral-100">Review Your Booking Request</h2>

                {/* Listing Details */}
                {listing ? (
                    <>
                        <div className="flex flex-col gap-6">
                            {/* 🔹 Listing Image with Host Details */}
                            <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
                                <img
                                    src={listing.imageSrcs?.[0] || "/images/placeholder.png"}
                                    alt="Listing"
                                    className="w-full h-full object-cover"
                                />
                                {/* 🔹 Dark Gradient Overlay */}
                                <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black to-transparent"></div>
                                {/* 🔹 Host Info */}
                                {host && (
                                    <div className="absolute bottom-4 left-4 flex items-center gap-3">
                                        <img
                                            src={host.image || "/images/placeholder.png"}
                                            alt="Host"
                                            className="w-12 h-12 rounded-full border-[3px] border-white"
                                        />
                                        <span className="text-white text-lg font-semibold">
                                            Hosted by {host.name || "Host"}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-3">
                                {/* Booking Summary */}
                                <div className="flex justify-between text-lg font-semibold">
                                    <span>Start-in:</span>
                                    <span>{new Date(startDate!).toDateString()}</span>
                                </div>
                                <div className="flex justify-between text-lg font-semibold">
                                    <span>Start-out:</span>
                                    <span>{new Date(endDate!).toDateString()}</span>
                                </div>
                            </div>
                            <hr className="dark:border-neutral-700" />
                            <div className="flex flex-col gap-3">
                                {/* Pricing Breakdown */}
                                <div className="font-bold mb-2">Basic Pricing</div>
                                <div className="flex justify-between">
                                    <span>Reservation Cost:</span>
                                    <span>AU$ {totalPrice}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Service Fee:</span>
                                    <span>AU$ {Math.round(Number(totalPrice) * 0.05)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Redrive Fees:</span>
                                    <span>AU$ {Math.round(Number(totalPrice) * 0.08)}</span>
                                </div>
                                {cleaningFee && Number(cleaningFee) > 0 && (
                                    <div className="flex justify-between">
                                        <span>Cleaning Fee:</span>
                                        <span>AU$ {cleaningFee}</span>
                                    </div>
                                )}
                                {returnCleaningFee && Number(returnCleaningFee) > 0 && (
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                        Cleaning fee of AU$ {returnCleaningFee} will be charged upon return.
                                    </div>
                                )}
                            </div>
                            <hr className="dark:border-neutral-700" />
                            <div className="flex flex-col gap-3">
                                {/* Insurance Details */}
                                <div className="font-bold mb-2">Insurance Options</div>
                                <div className="flex justify-between">
                                    <span>Selected Plan:</span>
                                    <span>{insuranceType}</span>
                                </div>
                                {insuranceType !== "No Insurance" && (
                                    <div className="flex justify-between">
                                        <span>Insurance Fee:</span>
                                        <span>AU$ {insuranceFee}</span>
                                    </div>
                                )}
                            </div>
                            <hr className="dark:border-neutral-700" />

                            {/* Total Price */}
                            <div className="flex justify-between text-xl font-bold">
                                <span>Total:</span>
                                <span>AU$ {totalFees}</span>
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <div className="flex flex-col sm:flex-row mt-6 gap-4">
                            <div className="w-full">
                                <button
                                    onClick={router.back}
                                    className="w-full py-3 text-md font-semibold rounded-lg bg-white dark:bg-neutral-900 text-red-600 border-[2px] border-red-600 transition-all duration-300"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="w-full">
                                <button
                                    onClick={handleConfirmBooking}
                                    className="w-full py-3 text-md font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-all duration-400"
                                >
                                    Request Booking
                                </button>
                            </div>
                        </div>

                    </>
                ) : (
                    <div className="animate-pulse space-y-4">
                        <div className="h-64 w-full bg-gray-200 dark:bg-neutral-700 rounded-lg" />
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-4 bg-gray-200 dark:bg-neutral-700 rounded" />
                        ))}
                    </div>
                )}
            </div>
        </Container>
    );
}
