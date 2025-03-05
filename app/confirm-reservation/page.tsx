"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import Button from "@/app/components/Button";
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [listing, setListing] = useState<any>(null);

    useEffect(() => {
        if (!listingId) return;

        // Fetch listing details from API
        axios.get(`/api/listings/${listingId}`)
            .then((response) => {
                setListing(response.data);
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

            toast.success("Booking confirmed!");
            router.push("/trips"); // ✅ Redirect user to "My Trips" page
        } catch (error) {
            console.error("❌ Error confirming booking:", error);
            toast.error("Error confirming booking. Please try again.");
        }
    };

    return (
        <Container>
            <Toaster />
            <div className="max-w-2xl mx-auto p-6 rounded-lg mt-10">
                <h2 className="text-2xl font-bold text-center mb-6">Confirm Your Booking</h2>

                {/* Listing Details */}
                {listing ? (
                    <>
                        <h3 className="text-lg font-semibold">{listing.title}</h3>
                        <p className="text-gray-600">{listing.suburb}, {listing.state}</p>
                        <hr className="my-4" />

                        {/* Booking Summary */}
                        <div className="flex justify-between text-lg font-semibold">
                            <span>Check-in:</span>
                            <span>{new Date(startDate!).toDateString()}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold">
                            <span>Check-out:</span>
                            <span>{new Date(endDate!).toDateString()}</span>
                        </div>
                        <hr className="my-4" />

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
                        <hr className="my-4" />

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
                        <hr className="my-4" />

                        {/* Total Price */}
                        <div className="flex justify-between text-xl font-bold">
                            <span>Total:</span>
                            <span>AU$ {totalFees}</span>
                        </div>

                        {/* Confirm Button */}
                        <div className="flex flex-row mt-6">
                            <div className="w-1/2 pr-2">
                                <button
                                    onClick={router.back}
                                    className="w-full py-3 text-md font-semibold rounded-lg bg-white text-red-600 border-[2px] border-red-600 transition-all duration-300"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="w-1/2 pl-2">
                                <button
                                    onClick={handleConfirmBooking}
                                    className="w-full py-3 text-md font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-all duration-400"
                                >
                                    Confirm Booking
                                </button>
                            </div>
                        </div>


                    </>
                ) : (
                    <p className="text-center text-gray-600">Loading listing details...</p>
                )}
            </div>
        </Container>
    );
}
