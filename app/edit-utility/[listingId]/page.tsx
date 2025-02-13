"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { useForm, FieldValues } from "react-hook-form";
import Input from "@/app/components/inputs/Input";
import CategoryInput from "@/app/components/inputs/CategoryInput";
import ImageUpload from "@/app/components/inputs/ImageUpload";
import Counter from "@/app/components/inputs/Counter";
import YearSelect from "@/app/components/inputs/YearSelect";
import FuelSelector from "@/app/components/inputs/FuelSelector";
import { categories } from "@/app/components/navbar/Categories";

interface Listing {
    id: string;
    title: string;
    description: string;
    category: string;
    imageSrc: string;
    guestCount: number;
    doorCount: number;
    sleepCount: number;
    year: number;
    fuelType: string;
    price: number;
}

const EditUtilityPage = () => {
    const router = useRouter();
    const params = useParams();
    const listingId = params?.listingId as string;

    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FieldValues>({
        defaultValues: {
            title: "",
            description: "",
            category: "",
            imageSrc: "",
            guestCount: 0,
            doorCount: 0,
            sleepCount: 0,
            year: "",
            fuelType: "",
            price: 1,
        },
    });

    useEffect(() => {
        if (!listingId) return;

        axios.get(`/api/listings/${listingId}`)
            .then(response => {
                const data: Listing = response.data;
                // ✅ Populate form with fetched data
                setValue("title", data.title);
                setValue("description", data.description);
                setValue("category", data.category);
                setValue("imageSrc", data.imageSrc);
                setValue("guestCount", data.guestCount);
                setValue("doorCount", data.doorCount);
                setValue("sleepCount", data.sleepCount);
                setValue("year", data.year.toString());
                setValue("fuelType", data.fuelType);
                setValue("price", data.price);
            })
            .catch(() => toast.error("Failed to load listing."));
    }, [listingId, setValue]);

    const onSubmit = async (data: FieldValues) => {
        setLoading(true);

        try {
            await axios.put(`/api/listings/${listingId}`, data);
            toast.success("Utility updated successfully!");
            router.push("/properties"); // Redirect after update
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Edit Your Utility</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="">
                {/* Title */}
                <div className="mb-8">
                    <Input
                        id="title"
                        label="Title"
                        register={register}
                        errors={errors}
                        required
                    />
                </div>
                {/* Description */}
                <div className="mb-8">
                    <Input
                        id="description"
                        label="Description"
                        register={register}
                        errors={errors}
                        required
                    />
                </div>




                {/* Category Selection */}
                <div>
                    <p className="font-bold mb-4">Select Category</p>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-8">
                        {categories.map((categoryItem) => (
                            <CategoryInput
                                key={categoryItem.label}
                                selected={watch("category") === categoryItem.label}
                                onClick={() => setValue("category", categoryItem.label)}
                                label={categoryItem.label}
                                icon={categoryItem.icon}
                            />
                        ))}
                    </div>
                </div>

                {/* Image Upload */}
                <div className="mb-8">
                    <p className="font-bold mb-4">Change Photo</p>
                    <ImageUpload
                        value={watch("imageSrc")}
                        onChange={(imageSrc) => setValue("imageSrc", imageSrc)}
                    />
                </div>

                {/* Counters */}
                <div className="mb-8 space-y-6">
                    <p className="font-bold mb-4">Utility Details</p>
                    <Counter
                        title="Guest Count"
                        subtitle="Maximum guests allowed"
                        value={watch("guestCount")}
                        onChange={(value) => setValue("guestCount", value)}
                    />
                    <Counter
                        title="Door Number"
                        subtitle="Doors that utility has"
                        value={watch("doorCount")}
                        onChange={(value) => setValue("doorCount", value)}
                    />
                    <Counter
                        title="Sleeping Capacity"
                        subtitle="Max sleeping space"
                        value={watch("sleepCount")}
                        onChange={(value) => setValue("sleepCount", value)}
                    />
                </div>


                {/* Year Select */}
                <div className="mb-8">
                    <p className="font-bold mb-4">Year</p>
                    <YearSelect
                        id="year"
                        label="Manufacturing Year"
                        register={register}
                        setValue={setValue}
                        watch={watch}
                        errors={errors}
                        required
                    />
                </div>
                <div className="mb-8">
                    <p className="font-bold mb-4">Fuel</p>
                    {/* Fuel Selector */}
                    <FuelSelector
                        id="fuelType"
                        label=""
                        setValue={setValue}
                        watch={watch}
                        errors={errors}
                        required
                    />
                </div>

                {/* Price Input */}
                <div className="mb-8">
                    <p className="font-bold mb-4">Pricing</p>
                    <Input
                        id="price"
                        label=""
                        type="number"
                        register={register}
                        errors={errors}
                        required
                    />
                </div>

                <div className="flex flex-row gap-4">
                    <button
                        type="submit"
                        className="w-full bg-teal-500 text-white font-semibold px-6 py-4 rounded-lg hover:bg-teal-400 transition-all disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? "Updating..." : "Update Utility"}
                    </button>
                    <button
                        type="button"
                        className="border-[3px] border-black hover:border-teal-500 hover:text-teal-500 w-full bg-white text-black font-semibold px-6 py-4 rounded-lg transition-all disabled:opacity-50"
                        onClick={() => router.back()} // ✅ Navigates back to the previous page
                    >
                        Go Back
                    </button>

                </div>
                {/* Submit Button */}

            </form>
        </div>
    );
};

export default EditUtilityPage;
