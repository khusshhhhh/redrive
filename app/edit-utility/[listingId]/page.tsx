/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import toast from "@/app/libs/toast";
import { useForm, FieldValues } from "react-hook-form";
import Input from "@/app/components/inputs/Input";
import AddressAutocomplete, { ParsedAddress } from "@/app/components/inputs/AddressAutocomplete";
import CategoryInput from "@/app/components/inputs/CategoryInput";
import ImageUpload from "@/app/components/inputs/ImageUpload";
import ListingPhotoManager from "@/app/components/inputs/ListingPhotoManager";
import Counter from "@/app/components/inputs/Counter";
import YearSelect from "@/app/components/inputs/YearSelect";
import FuelSelector from "@/app/components/inputs/FuelSelector";
import { categories } from "@/app/components/navbar/Categories";
import TextArea from "@/app/components/inputs/TextArea";
import { AMENITIES_LIST } from "@/app/hooks/useAmenities";
import StateSelector, { states as AU_STATES } from "@/app/components/inputs/StateSelector";
import SuburbSelector from "@/app/components/inputs/SuburbSelector";
import DateSelector from "@/app/components/inputs/DateSelector";
import CancellationPolicySelector from "@/app/components/listings/CancellationPolicySelector";
import { ArrowLeft, BadgeCheck, CarFront, Eye, ShieldCheck, Sparkles } from "lucide-react";

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
    cancellationPolicy?: string;
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
    const [cancellationPolicy, setCancellationPolicy] = useState('MODERATE');

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
            cancellationPolicy: 'MODERATE',
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
                setValue("cancellationPolicy", data.cancellationPolicy || 'MODERATE');

                setListingImages(data.imageSrcs || []);
                setRegoNumber(data.regoNumber || "");
                setRegoEndDate(
                    data.regoEndDate ? new Date(data.regoEndDate).toISOString().split("T")[0] : ""
                );
                setRegoImage(data.regoImage || "");
                setCleaningFeeOption(data.cleaningFeeOption || 'NO');
                setCleaningFeeAmount(data.cleaningFeeAmount ? String(data.cleaningFeeAmount) : '');
                setReturnCleaningFeeAmount(data.returnCleaningFeeAmount ? String(data.returnCleaningFeeAmount) : '');
                setCancellationPolicy(data.cancellationPolicy || 'MODERATE');

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

    const toggleAmenity = (id: string) => {
        setSelectedAmenities((prev) =>
            prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
        );
    };

    const onSubmit = async (data: FieldValues) => {
        if (!listingImages.length) {
            toast.error("Add a main photo before updating your listing");
            return;
        }
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
                cleaningFeeOption,
                cleaningFeeAmount: cleaningFeeAmount || null,
                returnCleaningFeeAmount: returnCleaningFeeAmount || null,
                cancellationPolicy,
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
        <main className="min-h-screen bg-surface-soft/45 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-[1240px]">
            <button type="button" onClick={() => router.back()} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft size={17} />Back to hosting</button>
            <header className="relative mb-7 overflow-hidden rounded-2xl bg-graphite px-6 py-8 text-white shadow-[0_24px_70px_rgba(59,59,59,0.2)] sm:px-9 sm:py-10">
                <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[42px] border-white/[0.05]" />
                <div className="absolute bottom-0 right-36 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
                <div className="relative max-w-3xl">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent"><Sparkles size={14} />Host studio</span>
                    <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Make every detail booking-ready.</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">Update the information guests use to compare, trust and book your vehicle. Your changes appear on the live listing after saving.</p>
                </div>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
                <aside className="space-y-4 lg:sticky lg:top-28">
                    <div className="overflow-hidden rounded-xl border border-hairline-soft bg-white shadow-card">
                        <div className="relative aspect-[16/10] bg-surface-strong">
                            {listingImages[0] ? <img src={listingImages[0]} alt={`${watch("title") || "Your vehicle"} listing preview`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-primary"><CarFront size={38} /></div>}
                            <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink shadow-sm">Live preview</span>
                        </div>
                        <div className="p-5">
                            <p className="line-clamp-2 font-semibold text-ink">{watch("title") || "Your listing title"}</p>
                            <p className="mt-1 text-xs text-muted">{selectedSuburb?.value || "Suburb"}, {selectedState?.value || "State"}</p>
                            <p className="mt-4 text-lg font-semibold text-ink">AU${watch("price") || 0}<span className="text-xs font-normal text-muted"> / day</span></p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-hairline-soft bg-white p-5">
                        <p className="flex items-center gap-2 text-sm font-semibold text-ink"><BadgeCheck size={17} className="text-primary" />Publishing checklist</p>
                        <ul className="mt-4 space-y-3 text-xs leading-5 text-muted">
                            <li className="flex gap-2"><Eye size={15} className="mt-0.5 shrink-0 text-primary" />Use clear, current photos and an accurate title.</li>
                            <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" />Keep registration and cancellation terms current.</li>
                        </ul>
                    </div>
                </aside>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 [&>div:not(:last-child)]:rounded-xl [&>div:not(:last-child)]:border [&>div:not(:last-child)]:border-hairline-soft [&>div:not(:last-child)]:bg-white [&>div:not(:last-child)]:p-5 [&>div:not(:last-child)]:shadow-[0_8px_28px_rgba(22, 22, 22,0.045)] sm:[&>div:not(:last-child)]:p-7">
                {/* Title */}
                <div className="mb-8">
                    <Input id="title" label="Listing title" placeholder="e.g. Powerful ute in Adelaide" register={register} errors={errors} required />
                </div>

                {/* Description */}
                <div className="mb-8">
                    <TextArea id="description" label="Description" placeholder="Describe what makes your vehicle useful, comfortable or unique." register={register} errors={errors} required />
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
                    <p className="mb-1 font-semibold text-ink">Listing photos</p>
                    <p className="mb-5 text-sm leading-5 text-muted">The main photo appears first everywhere. Add up to nine supporting photos.</p>
                    <ListingPhotoManager images={listingImages} onChange={setListingImages} disabled={loading} />
                </div>

                {/* Location */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Location</p>
                    <div className="flex flex-col gap-6">
                        <AddressAutocomplete
                            id="address"
                            label="Number & street address"
                            register={register}
                            setValue={setValue}
                            errors={errors}
                            required
                            onSelect={onAddressSelect}
                        />
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">Suburb</label>
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
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">State</label>
                            <StateSelector value={selectedState} onChange={setSelectedState} />
                        </div>
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
                    <TextArea id="information" label="Additional information" placeholder="Add instructions, care requirements or anything guests should know." register={register} errors={errors} required />
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
                    <div className="mt-5">
                        <label className="mb-1.5 block text-xs font-medium text-muted">Registration expiry date</label>
                        <DateSelector value={regoEndDate} onChange={(date) => setRegoEndDate(date)} />
                    </div>
                </div>

                {/* Registration Image */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Registration Image</p>
                        <ImageUpload folder="registrations" value={regoImage} onChange={(image) => setRegoImage(image)} />
                </div>

                {/* Pricing */}
                <div className="mb-8">
                    <p className="font-semibold mb-4 text-ink">Pricing</p>
                    <Input
                        id="price"
                        label="Daily price (AUD)"
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

                <div className="mb-8">
                    <div className="mb-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Booking terms</p>
                        <h2 className="mt-2 text-xl font-semibold text-ink">Cancellation policy</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">Choose how much flexibility guests receive. Existing reservations keep the policy captured when they booked.</p>
                    </div>
                    <CancellationPolicySelector value={cancellationPolicy} onChange={setCancellationPolicy} disabled={loading} />
                </div>

                {/* Submit and Go Back Buttons */}
                <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-hairline bg-white/95 p-4 shadow-[0_18px_55px_rgba(22, 22, 22,0.16)] backdrop-blur sm:flex-row">
                    <button
                        type="submit"
                        className="w-full bg-primary text-white font-semibold px-6 py-4 rounded-sm hover:bg-primary-active transition-all disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? "Saving changes…" : "Save listing changes"}
                    </button>
                    <button
                        type="button"
                        className="border border-ink hover:bg-ink hover:text-white w-full bg-white text-ink font-semibold px-6 py-4 rounded-sm transition-all disabled:opacity-50"
                        onClick={() => router.back()}
                    >
                        Discard and go back
                    </button>
                </div>
            </form>
            </div>
        </div>
        </main>
    );
};

export default EditUtilityPage;
