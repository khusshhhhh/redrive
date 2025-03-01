/* eslint-disable @next/next/no-img-element */
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
import TextArea from "@/app/components/inputs/TextArea";
import { AMENITIES_LIST } from "@/app/hooks/useAmenities"; // ✅ Import amenities list
import StateSelector from "@/app/components/inputs/StateSelector";
import SuburbSelector from "@/app/components/inputs/SuburbSelector";
import DateSelector from "@/app/components/inputs/DateSelector";


interface Listing {
    id: string;
    title: string;
    description: string;
    information: string;
    category: string;
    guestCount: number;
    doorCount: number;
    sleepCount: number;
    year: number;
    fuelType: string;
    price: number;
    state: string;
    suburb: string;
    address: string;
    latitude?: number;
    longitude?: number;
    amenities: string[];
    imageSrcs: string[];
    regoNumber: string;
    regoEndDate: string;
    regoImage: string;
}

const EditUtilityPage = () => {
    const router = useRouter();
    const params = useParams();
    const listingId = params?.listingId as string;

    const [loading, setLoading] = useState(false);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]); // ✅ Added state
    const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(null);
    const [selectedSuburb, setSelectedSuburb] = useState<{ value: string; label: string } | null>(null);
    const [listingImages, setListingImages] = useState<string[]>([]);
    const [regoNumber, setRegoNumber] = useState("");
    const [regoEndDate, setRegoEndDate] = useState("");
    const [regoImage, setRegoImage] = useState("");


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
            information: "",
            category: "",
            imageSrcs: [],
            guestCount: 0,
            doorCount: 0,
            sleepCount: 0,
            year: "",
            fuelType: "",
            price: 1,
            state: "",
            suburb: "",
            address: "",
            amenities: [],
            regoNumber: '',
            regoEndDate: new Date(),
            regoImage: "",
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
                setValue("information", data.information);
                setValue("category", data.category);
                setValue("guestCount", data.guestCount);
                setValue("doorCount", data.doorCount);
                setValue("sleepCount", data.sleepCount);
                setValue("year", data.year.toString());
                setValue("fuelType", data.fuelType);
                setValue("price", data.price);
                setValue("state", data.state);
                setValue("suburb", data.suburb);
                setValue("address", data.address);

                // ✅ Load existing images
                setListingImages(data.imageSrcs || []);

                // ✅ Load registration details
                setRegoNumber(data.regoNumber || "");
                setRegoEndDate(data.regoEndDate ? new Date(data.regoEndDate).toISOString().split("T")[0] : "");
                setRegoImage(data.regoImage || "");

                setSelectedState({ value: data.state, label: data.state });
                setSelectedSuburb({ value: data.suburb, label: data.suburb });
                setSelectedAmenities(data.amenities || []); // ✅ Set existing amenities
            })
            .catch(() => toast.error("Failed to load listing."));
    }, [listingId, setValue]);

    const toggleAmenity = (id: string) => {
        setSelectedAmenities(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    if (listingImages.length > 10) {
        toast.error("You can only upload up to 10 images.");
        return;
    }

    const onSubmit = async (data: FieldValues) => {
        setLoading(true);

        try {
            await axios.put(`/api/listings/${listingId}`, {
                ...data, state: selectedState?.value, suburb: selectedSuburb?.value, amenities: selectedAmenities,
                imageSrcs: listingImages,
                regoNumber,
                regoEndDate,
                regoImage,
            }); // ✅ Send amenities
            toast.success("Utility updated successfully!");
            router.push("/properties"); // Redirect after update
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageDelete = (imageToDelete: string) => {
        setListingImages(listingImages.filter((img) => img !== imageToDelete));
    };


    return (
        <div className="max-w-3xl mx-auto p-6 bg-white">
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

                <div className="mb-8">
                    <p className="font-bold mb-4">Property Images</p>

                    {/* ✅ Display Existing Images with Delete Option */}
                    <div className="grid grid-cols-3 gap-3">
                        {listingImages.map((image, index) => (
                            <div key={index} className="relative">
                                <img src={image} alt="Listing Image" className="w-full h-auto rounded-md" />
                                <button
                                    type="button"
                                    onClick={() => handleImageDelete(image)}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* ✅ Allow Uploading More Images if Below 10 */}
                    {listingImages.length < 10 && (
                        <ImageUpload
                            value={listingImages.length > 0 ? listingImages[0] : ""} // ✅ Pass a single image or empty string
                            onChange={(image) => {
                                if (listingImages.length < 10) {
                                    setListingImages([...listingImages, image]); // ✅ Add new image to array
                                } else {
                                    toast.error("You can only upload up to 10 images.");
                                }
                            }}
                        />
                    )}

                </div>


                <div className="mb-8">
                    <p className="font-bold mb-4">Location</p>
                    <div className="flex flex-col gap-6">
                        <StateSelector value={selectedState} onChange={setSelectedState} />
                        <SuburbSelector state={selectedState?.value} value={selectedSuburb} onChange={setSelectedSuburb} />
                        <Input id="address" label="Number & Street Address" register={register} errors={errors} required />
                    </div>
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

                <div className="mb-8">
                    <p className="font-bold mb-4">Additional Information</p>
                    <TextArea
                        id="information"
                        label=""
                        register={register}
                        errors={errors}
                        required
                    />
                </div>

                <div className="mb-8">
                    <p className="font-bold mb-4">Select Amenities</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AMENITIES_LIST.map((amenity) => (
                            <button
                                key={amenity.id}
                                type="button"
                                onClick={() => toggleAmenity(amenity.id)}
                                className={`p-3 flex items-center gap-2 border-2 rounded-md transition ${selectedAmenities.includes(amenity.id) ? "bg-black text-white" : "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                <i className={`${amenity.icon} text-lg`}></i>
                                <span>{amenity.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <p className="font-bold mb-4">Registration Details</p>

                    {/* ✅ Registration Number Input */}
                    <Input
                        id="regoNumber"
                        label="Rego Number"
                        value={regoNumber} // ✅ Fixing the issue here
                        onChange={(e) => setRegoNumber(e.target.value)}
                        register={register}
                        errors={errors}
                    />


                    {/* ✅ Registration Expiry Date Selector */}
                    <DateSelector
                        value={regoEndDate}
                        onChange={(date) => setRegoEndDate(date)}

                    />

                </div>

                <div className="mb-8">
                    <p className="font-bold mb-4">Registration Image</p>

                    {/* ✅ Upload Rego Image */}
                    <ImageUpload
                        value={regoImage}
                        onChange={(image) => setRegoImage(image)}
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
