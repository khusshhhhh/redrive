/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { useForm, FieldValues } from "react-hook-form";
import Input from "@/app/components/inputs/Input";
import AddressAutocomplete, { ParsedAddress } from "@/app/components/inputs/AddressAutocomplete";
import CategoryInput from "@/app/components/inputs/CategoryInput";
import ImageUpload from "@/app/components/inputs/ImageUpload";
import Counter from "@/app/components/inputs/Counter";
import YearSelect from "@/app/components/inputs/YearSelect";
import FuelSelector from "@/app/components/inputs/FuelSelector";
import { categories } from "@/app/components/navbar/Categories";
import TextArea from "@/app/components/inputs/TextArea";
import { AMENITIES_LIST } from "@/app/hooks/useAmenities";
import StateSelector, { states as AU_STATES } from "@/app/components/inputs/StateSelector";
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
    amenities: string[];
    imageSrcs: string[];
    regoNumber: string;
    regoEndDate: string;
    regoImage: string;
    cleaningFeeOption?: string;
    cleaningFeeAmount?: number;
    returnCleaningFeeAmount?: number;
}

const EditUtilityPage = () => {
    const router = useRouter();
    const params = useParams();
    const listingId = params?.listingId as string;

    const [loading, setLoading] = useState(false);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(null);
    const [selectedSuburb, setSelectedSuburb] = useState<{ value: string; label: string } | null>(null);
    const [listingImages, setListingImages] = useState<string[]>([]);
    const [regoNumber, setRegoNumber] = useState("");
    const [regoEndDate, setRegoEndDate] = useState("");
    const [regoImage, setRegoImage] = useState("");
    const [cleaningFeeOption, setCleaningFeeOption] = useState('NO');
    const [cleaningFeeAmount, setCleaningFeeAmount] = useState('');
    const [returnCleaningFeeAmount, setReturnCleaningFeeAmount] = useState('');

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
            regoNumber: "",
            regoEndDate: new Date(),
            regoImage: "",
            cleaningFeeOption: 'NO',
            cleaningFeeAmount: '',
            returnCleaningFeeAmount: '',
        },
    });

    // Fetch the listing details (including images) on mount.
    useEffect(() => {
        if (!listingId) return;

        axios
            .get(`/api/listings/${listingId}`)
            .then((response) => {
                const data: Listing = response.data;
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
                setValue("amenities", data.amenities);
                setValue("cleaningFeeOption", data.cleaningFeeOption || 'NO');
                setValue("cleaningFeeAmount", data.cleaningFeeAmount || '');
                setValue("returnCleaningFeeAmount", data.returnCleaningFeeAmount || '');

                // Load images and registration details
                setListingImages(data.imageSrcs || []);
                setRegoNumber(data.regoNumber || "");
                setRegoEndDate(
                    data.regoEndDate ? new Date(data.regoEndDate).toISOString().split("T")[0] : ""
                );
                setRegoImage(data.regoImage || "");
                setCleaningFeeOption(data.cleaningFeeOption || 'NO');
                setCleaningFeeAmount(data.cleaningFeeAmount ? String(data.cleaningFeeAmount) : '');
                setReturnCleaningFeeAmount(data.returnCleaningFeeAmount ? String(data.returnCleaningFeeAmount) : '');

                setSelectedState({ value: data.state, label: data.state });
                setSelectedSuburb({ value: data.suburb, label: data.suburb });
                setSelectedAmenities(data.amenities || []);
            })
            .catch(() => toast.error("Failed to load listing."));
    }, [listingId, setValue]);

    // Auto-fills State/Suburb from a Google Places selection alongside the
    // street address itself, so picking one suggestion fills the whole block.
    const onAddressSelect = (result: ParsedAddress) => {
        if (result.state) {
            const known = AU_STATES.find((s) => s.value === result.state);
            setSelectedState(known || { value: result.state, label: result.state });
        }
        if (result.suburb) {
            setSelectedSuburb({
                value: result.suburb,
                label: result.postcode ? `${result.suburb}, ${result.postcode}` : result.suburb,
            });
        }
    };

    // Toggle an amenity
    const toggleAmenity = (id: string) => {
        setSelectedAmenities((prev) =>
            prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
        );
    };

    // Delete an image from the listing
    const handleImageDelete = (imageToDelete: string) => {
        setListingImages((prev) => prev.filter((img) => img !== imageToDelete));
    };

    // Add a new image if below the 10-image limit
    const handleAddImage = (imageUrl: string) => {
        if (listingImages.length >= 10) {
            toast.error("You can only upload up to 10 images.");
            return;
        }
        setListingImages((prev) => [...prev, imageUrl]);
    };

    const onSubmit = async (data: FieldValues) => {
        setLoading(true);
        try {
            await axios.put(`/api/listings/${listingId}`, {
                ...data,
                state: selectedState?.value,
                suburb: selectedSuburb?.value,
                amenities: selectedAmenities,
                imageSrcs: listingImages,
                regoNumber,
                regoEndDate,
                regoImage,
                // ✅ submit cleaning fee values from the form data
                cleaningFeeOption: data.cleaningFeeOption,
                cleaningFeeAmount: data.cleaningFeeAmount || null,
                returnCleaningFeeAmount: data.returnCleaningFeeAmount || null,
            });
            toast.success("Utility updated successfully!");
            router.push("/properties");
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 md:p-8 bg-white shadow-card rounded-md border border-hairline-soft my-10">
            <h2 className="text-display-sm font-semibold mb-6 text-center text-ink">Edit Your Utility</h2>
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Title */}
                <div className="mb-8">
                    <Input id="title" label="Title" register={register} errors={errors} required />
                </div>

                {/* Description */}
                <div className="mb-8">
                    <TextArea id="description" label="Description" register={register} errors={errors} required />
                </div>

                {/* Category Selection */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Select Category</p>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
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

                {/* Images Section */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Property Images</p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {listingImages.map((image, index) => (
                            <div key={index} className="relative">
                                <img
                                    src={image}
                                    alt={`Image ${index + 1}`}
                                    className="w-full h-auto rounded-md"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleImageDelete(image)}
                                    className="absolute top-0 right-0 bg-error text-white p-1 rounded-full"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                    {listingImages.length < 10 && (
                        <div className="mb-4">
                            <ImageUpload value="" onChange={handleAddImage} />
                        </div>
                    )}
                </div>

                {/* Location */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Location</p>
                    <div className="flex flex-col gap-6">
                        <AddressAutocomplete
                            id="address"
                            label="Number & Street Address"
                            register={register}
                            setValue={setValue}
                            errors={errors}
                            required
                            onSelect={onAddressSelect}
                        />
                        <SuburbSelector
                            state={selectedState?.value}
                            value={selectedSuburb}
                            allowAllStates
                            onChange={(selected) => {
                                setSelectedSuburb(selected);
                                if (selected.state) {
                                    const state = AU_STATES.find((item) => item.value === selected.state);
                                    if (state) setSelectedState(state);
                                }
                            }}
                        />
                        <StateSelector value={selectedState} onChange={setSelectedState} />
                    </div>
                </div>

                {/* Utility Details Counters */}
                <div className="mb-8 space-y-6">
                    <p className="font-semibold mb-4 text-ink">Utility Details</p>
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
                    <p className="font-semibold mb-4 text-ink">Year</p>
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

                {/* Fuel Selector */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Fuel</p>
                    <FuelSelector
                        id="fuelType"
                        label=""
                        setValue={setValue}
                        watch={watch}
                        errors={errors}
                        required
                    />
                </div>

                {/* Additional Information */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Additional Information</p>
                    <TextArea id="information" label="" register={register} errors={errors} required />
                </div>

                {/* Amenities Selection */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Select Amenities</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AMENITIES_LIST.map((amenity) => (
                            <button
                                key={amenity.id}
                                type="button"
                                onClick={() => toggleAmenity(amenity.id)}
                                className={`p-3 flex items-center gap-2 border rounded-sm transition ${selectedAmenities.includes(amenity.id)
                                    ? "border-ink bg-ink text-white"
                                    : "border-hairline text-ink hover:border-ink"
                                    }`}
                            >
                                <i className={`${amenity.icon} text-lg`}></i>
                                <span>{amenity.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Registration Details */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Registration Details</p>
                    <Input
                        id="regoNumber"
                        label="Rego Number"
                        value={regoNumber}
                        onChange={(e) => setRegoNumber(e.target.value)}
                        register={register}
                        errors={errors}
                    />
                    <DateSelector value={regoEndDate} onChange={(date) => setRegoEndDate(date)} />
                </div>

                {/* Registration Image */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Registration Image</p>
                    <ImageUpload folder="licenses" value={regoImage} onChange={(image) => setRegoImage(image)} />
                </div>

                {/* Pricing */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Pricing</p>
                    <Input
                        id="price"
                        label=""
                        type="number"
                        register={register}
                        errors={errors}
                        required
                    />
                </div>

                {/* Cleaning Fees */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Cleaning Fees</p>
                    <div className="flex flex-col gap-2 text-ink">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                className="accent-ink"
                                value="YES"
                                checked={cleaningFeeOption === 'YES'}
                                onChange={() => setCleaningFeeOption('YES')}
                            />
                            Yes
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                className="accent-ink"
                                value="NO"
                                checked={cleaningFeeOption === 'NO'}
                                onChange={() => setCleaningFeeOption('NO')}
                            />
                            No
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                className="accent-ink"
                                value="UPON_RETURNING"
                                checked={cleaningFeeOption === 'UPON_RETURNING'}
                                onChange={() => setCleaningFeeOption('UPON_RETURNING')}
                            />
                            Upon Returning
                        </label>
                    </div>
                    {cleaningFeeOption === 'YES' && (
                        <Input
                            id="cleaningFeeAmount"
                            label="Cleaning Fee (AUD)"
                            type="number"
                            value={cleaningFeeAmount}
                            onChange={(e) => setCleaningFeeAmount(e.target.value)}
                            register={register}
                            errors={errors}
                        />
                    )}
                    {cleaningFeeOption === 'UPON_RETURNING' && (
                        <div className="mt-4 flex flex-col gap-2">
                            <p className="text-sm text-muted">
                                User can add desired amount after the utility is returned.
                            </p>
                            <Input
                                id="returnCleaningFeeAmount"
                                label="Amount on Return (AUD)"
                                type="number"
                                value={returnCleaningFeeAmount}
                                onChange={(e) => setReturnCleaningFeeAmount(e.target.value)}
                                register={register}
                                errors={errors}
                            />
                        </div>
                    )}
                </div>

                {/* Submit and Go Back Buttons */}
                <div className="flex flex-row gap-4">
                    <button
                        type="submit"
                        className="w-full bg-primary text-white font-semibold px-6 py-4 rounded-sm hover:bg-primary-active transition-all disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? "Updating..." : "Update Utility"}
                    </button>
                    <button
                        type="button"
                        className="border border-ink hover:bg-ink hover:text-white w-full bg-white text-ink font-semibold px-6 py-4 rounded-sm transition-all disabled:opacity-50"
                        onClick={() => router.back()}
                    >
                        Go Back
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditUtilityPage;
