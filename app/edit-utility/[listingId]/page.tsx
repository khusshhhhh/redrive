/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import useUnsavedChangesWarning from "@/app/hooks/useUnsavedChangesWarning";
import { applyApiFieldErrors } from "@/app/libs/formErrors";
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
import DatePicker from "@/app/components/inputs/DatePicker";
import CancellationPolicySelector from "@/app/components/listings/CancellationPolicySelector";
import CalendarSyncPanel from "@/app/components/listings/CalendarSyncPanel";
import OptionSelector from "@/app/components/inputs/OptionSelector";
import ToggleRow from "@/app/components/inputs/ToggleRow";
import ChipMultiSelect from "@/app/components/inputs/ChipMultiSelect";
import {
  TRANSMISSION_OPTIONS,
  TYRE_CONDITION_OPTIONS,
  CHARGE_PORT_OPTIONS,
  HANDOVER_METHOD_OPTIONS,
  TOLL_HANDLING_OPTIONS,
  DEPOSIT_HOLD_OPTIONS,
  SHOWER_TYPE_OPTIONS,
  TOILET_TYPE_OPTIONS,
  SAFETY_FEATURES_LIST,
  LANGUAGE_OPTIONS,
  categorySpecGroup,
} from "@/app/libs/vehicleFacts";
import { LISTING_EXTRA_FIELDS, LISTING_EXTRA_ARRAY_FIELDS } from "@/app/libs/listingExtras";
import { ArrowLeft, BadgeCheck, CarFront, Eye, ShieldCheck, Sparkles } from "lucide-react";

const EXTRA_BOOL_DEFAULT_TRUE = new Set<string>([
  "smokeFree", "petFree", "interstateAllowed", "festivalsAllowed",
  "additionalDriversAllowed", "provisionalLicenceAllowed", "internationalLicenceAccepted",
]);
const EXTRA_SCALAR_FIELDS = LISTING_EXTRA_FIELDS.filter(
  (field) => !(LISTING_EXTRA_ARRAY_FIELDS as readonly string[]).includes(field),
);

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
    const [formTouched, setFormTouched] = useState(false);
    useUnsavedChangesWarning(formTouched && !loading);
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
    const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
    const [safetyFeatures, setSafetyFeatures] = useState<string[]>([]);
    const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        setError,
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
            ...Object.fromEntries(EXTRA_SCALAR_FIELDS.map((field) => [field, EXTRA_BOOL_DEFAULT_TRUE.has(field) ? true : ""])),
        },
    });

    // Fetch the listing details (including images) on mount.
    useEffect(() => {
        if (!listingId) return;

        axios
            .get(`/api/listings/${listingId}`)
            .then((response) => {
                const data = response.data as Listing & Record<string, unknown>;
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

                // Extended vehicle fields.
                EXTRA_SCALAR_FIELDS.forEach((field) => {
                    const raw = data[field];
                    if (field === "lastServicedAt") {
                        setValue(field, raw ? new Date(String(raw)).toISOString().split("T")[0] : "");
                    } else if (typeof raw === "boolean") {
                        setValue(field, raw);
                    } else if (raw === null || raw === undefined) {
                        setValue(field, EXTRA_BOOL_DEFAULT_TRUE.has(field) ? true : "");
                    } else {
                        setValue(field, raw as string | number);
                    }
                });
                setDamagePhotos(Array.isArray(data.damagePhotos) ? (data.damagePhotos as string[]) : []);
                setSafetyFeatures(Array.isArray(data.safetyFeatures) ? (data.safetyFeatures as string[]) : []);
                setLanguagesSpoken(Array.isArray(data.languagesSpoken) ? (data.languagesSpoken as string[]) : []);
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
                damagePhotos,
                safetyFeatures,
                languagesSpoken,
            });
            toast.success("Utility updated successfully!");
            setFormTouched(false);
            router.push("/properties");
        } catch (error) {
            const mapped = applyApiFieldErrors(error, setError);
            toast.error(mapped ? "Please fix the highlighted fields" : "Something went wrong.");
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

                <form onSubmit={handleSubmit(onSubmit)} onChange={() => setFormTouched(true)} className="space-y-5 [&>div:not(:last-child)]:rounded-xl [&>div:not(:last-child)]:border [&>div:not(:last-child)]:border-hairline-soft [&>div:not(:last-child)]:bg-white [&>div:not(:last-child)]:p-5 [&>div:not(:last-child)]:shadow-[0_8px_28px_rgba(22, 22, 22,0.045)] sm:[&>div:not(:last-child)]:p-7">
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
                        <DatePicker value={regoEndDate} onChange={(date) => setRegoEndDate(date)} minDate={new Date()} placeholder="Select the expiry date" ariaLabel="Registration expiry date" />
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

                {/* Specifications */}
                <div className="mb-8 space-y-5">
                    <p className="font-semibold text-ink">Specifications</p>
                    <OptionSelector label="Transmission" options={TRANSMISSION_OPTIONS} value={watch("transmission") as string} onChange={(v) => setValue("transmission", v)} />
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Input id="odometer" label="Odometer (km)" type="number" register={register} errors={errors} />
                        <Input id="seatbeltCount" label="Seatbelts" type="number" register={register} errors={errors} />
                        <Input id="colour" label="Colour" register={register} errors={errors} />
                        <Input id="keysProvided" label="Sets of keys" type="number" register={register} errors={errors} />
                        <Input id="fuelTankLitres" label="Fuel tank (L)" type="number" register={register} errors={errors} />
                        <Input id="drivingRangeKm" label="Driving range (km)" type="number" register={register} errors={errors} />
                        <Input id="isofixPoints" label="ISOFIX points" type="number" register={register} errors={errors} />
                        <Input id="childSeatsAvailable" label="Child seats available" type="number" register={register} errors={errors} />
                        <Input id="luggageLargeBags" label="Large bags it fits" type="number" register={register} errors={errors} />
                        <Input id="luggageCabinBags" label="Cabin bags it fits" type="number" register={register} errors={errors} />
                        <Input id="vehicleHeightMeters" label="Vehicle height (m)" type="number" register={register} errors={errors} />
                        <Input id="groundClearanceMm" label="Ground clearance (mm)" type="number" register={register} errors={errors} />
                    </div>
                    <ToggleRow title="E-tag / toll tag fitted" value={!!watch("hasTollTag")} onChange={(v) => setValue("hasTollTag", v)} />
                    {(watch("fuelType") === "EV" || watch("fuelType") === "Hybrid") && (
                        <div className="space-y-5 rounded-lg border border-hairline-soft p-4">
                            <p className="text-sm font-semibold text-ink">Charging</p>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Input id="batteryCapacityKwh" label="Battery capacity (kWh)" type="number" register={register} errors={errors} />
                                <Input id="maxChargingKw" label="Max DC charge rate (kW)" type="number" register={register} errors={errors} />
                            </div>
                            <OptionSelector label="Charge port" options={CHARGE_PORT_OPTIONS} value={watch("chargePortType") as string} onChange={(v) => setValue("chargePortType", v)} allowDeselect />
                            <ToggleRow title="Portable charger included" value={!!watch("portableChargerIncluded")} onChange={(v) => setValue("portableChargerIncluded", v)} />
                        </div>
                    )}
                </div>

                {/* Safety */}
                <div className="mb-8 space-y-5">
                    <p className="font-semibold text-ink">Safety</p>
                    <OptionSelector label="ANCAP rating" columns={3} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}★` }))} value={watch("ancapRating") ? String(watch("ancapRating")) : ""} onChange={(v) => setValue("ancapRating", v)} allowDeselect />
                    <ChipMultiSelect items={SAFETY_FEATURES_LIST} selected={safetyFeatures} onToggle={(id) => setSafetyFeatures((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} />
                    <ToggleRow title="First-aid kit on board" value={!!watch("firstAidKit")} onChange={(v) => setValue("firstAidKit", v)} />
                    <ToggleRow title="Fire extinguisher on board" value={!!watch("fireExtinguisher")} onChange={(v) => setValue("fireExtinguisher", v)} />
                </div>

                {/* Condition & history */}
                <div className="mb-8 space-y-5">
                    <p className="font-semibold text-ink">Condition &amp; history</p>
                    <TextArea id="damageNotes" label="Existing damage & cosmetic quirks" register={register} errors={errors} />
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">Photos of existing damage</label>
                        <ListingPhotoManager images={damagePhotos} onChange={setDamagePhotos} disabled={loading} />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">Last serviced</label>
                            <DatePicker value={(watch("lastServicedAt") as string) || ""} onChange={(date) => setValue("lastServicedAt", date)} maxDate={new Date()} placeholder="Select the last service date" ariaLabel="Last service date" />
                        </div>
                        <Input id="lastServiceOdometer" label="Odometer at last service (km)" type="number" register={register} errors={errors} />
                    </div>
                    <OptionSelector label="Tyre condition" columns={3} options={TYRE_CONDITION_OPTIONS} value={watch("tyreCondition") as string} onChange={(v) => setValue("tyreCondition", v)} allowDeselect />
                    <Input id="modifications" label="Modifications" register={register} errors={errors} />
                    <ToggleRow title="Spare tyre & tools on board" value={!!watch("spareTyre")} onChange={(v) => setValue("spareTyre", v)} />
                    <ToggleRow title="Smoke-free vehicle" value={!!watch("smokeFree")} onChange={(v) => setValue("smokeFree", v)} />
                    <ToggleRow title="Pet-free vehicle" value={!!watch("petFree")} onChange={(v) => setValue("petFree", v)} />
                    <ToggleRow title="Dashcam fitted" value={!!watch("hasDashcam")} onChange={(v) => setValue("hasDashcam", v)} />
                    <ToggleRow title="GPS tracker fitted" value={!!watch("hasGpsTracker")} onChange={(v) => setValue("hasGpsTracker", v)} />
                </div>

                {/* Trip rules */}
                <div className="mb-8 space-y-5">
                    <p className="font-semibold text-ink">Trip rules</p>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Input id="dailyKmAllowance" label="Daily km allowance (blank = unlimited)" type="number" register={register} errors={errors} />
                        <Input id="excessKmFee" label="Excess km fee (AUD/km)" type="number" register={register} errors={errors} />
                        <Input id="minimumDriverAge" label="Minimum driver age" type="number" register={register} errors={errors} />
                        <Input id="minimumLicenceYears" label="Minimum years licensed" type="number" register={register} errors={errors} />
                        <Input id="additionalDriverFee" label="Additional driver fee (AUD)" type="number" register={register} errors={errors} />
                    </div>
                    <Input id="interstateNotes" label="Interstate notes" register={register} errors={errors} />
                    <ToggleRow title="Interstate travel allowed" value={!!watch("interstateAllowed")} onChange={(v) => setValue("interstateAllowed", v)} />
                    <ToggleRow title="Unsealed / gravel roads allowed" value={!!watch("unsealedRoadsAllowed")} onChange={(v) => setValue("unsealedRoadsAllowed", v)} />
                    <ToggleRow title="Off-road / 4WD tracks allowed" value={!!watch("offRoadAllowed")} onChange={(v) => setValue("offRoadAllowed", v)} />
                    <ToggleRow title="Festivals & events allowed" value={!!watch("festivalsAllowed")} onChange={(v) => setValue("festivalsAllowed", v)} />
                    <ToggleRow title="Track days allowed" value={!!watch("trackDaysAllowed")} onChange={(v) => setValue("trackDaysAllowed", v)} />
                    <ToggleRow title="Additional drivers allowed" value={!!watch("additionalDriversAllowed")} onChange={(v) => setValue("additionalDriversAllowed", v)} />
                    <ToggleRow title="Provisional (P) drivers allowed" value={!!watch("provisionalLicenceAllowed")} onChange={(v) => setValue("provisionalLicenceAllowed", v)} />
                    <ToggleRow title="International licences accepted" value={!!watch("internationalLicenceAccepted")} onChange={(v) => setValue("internationalLicenceAccepted", v)} />
                    <ToggleRow title="Pets allowed" value={!!watch("petsAllowed")} onChange={(v) => setValue("petsAllowed", v)} />
                    <ToggleRow title="Smoking allowed" value={!!watch("smokingAllowed")} onChange={(v) => setValue("smokingAllowed", v)} />
                </div>

                {/* Pickup & delivery */}
                <div className="mb-8 space-y-5">
                    <p className="font-semibold text-ink">Pickup &amp; delivery</p>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Input id="deliveryRadiusKm" label="Delivery radius (km)" type="number" register={register} errors={errors} />
                        <Input id="deliveryFee" label="Delivery fee (AUD)" type="number" register={register} errors={errors} />
                        <Input id="airportPickupFee" label="Airport fee (AUD)" type="number" register={register} errors={errors} />
                        <Input id="pickupWindowStart" label="Pickup from (time)" register={register} errors={errors} />
                        <Input id="pickupWindowEnd" label="Pickup until (time)" register={register} errors={errors} />
                    </div>
                    <Input id="pickupInstructions" label="Pickup instructions" register={register} errors={errors} />
                    <ToggleRow title="I can deliver the vehicle" value={!!watch("deliveryAvailable")} onChange={(v) => setValue("deliveryAvailable", v)} />
                    <ToggleRow title="Airport pickup / drop-off" value={!!watch("airportPickup")} onChange={(v) => setValue("airportPickup", v)} />
                    <OptionSelector label="Handover method" columns={3} options={HANDOVER_METHOD_OPTIONS} value={watch("handoverMethod") as string} onChange={(v) => setValue("handoverMethod", v)} allowDeselect />
                    <ChipMultiSelect items={LANGUAGE_OPTIONS} selected={languagesSpoken} onToggle={(id) => setLanguagesSpoken((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])} />
                </div>

                {/* Costs to expect */}
                <div className="mb-8 space-y-5">
                    <p className="font-semibold text-ink">Costs to expect</p>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Input id="securityDeposit" label="Security deposit (AUD)" type="number" register={register} errors={errors} />
                        <Input id="weeklyDiscountPercent" label="Weekly discount (%)" type="number" register={register} errors={errors} />
                        <Input id="monthlyDiscountPercent" label="Monthly discount (%)" type="number" register={register} errors={errors} />
                        <Input id="lateReturnFeePerHour" label="Late return (AUD/hour)" type="number" register={register} errors={errors} />
                        <Input id="refuellingFeePerLitre" label="Refuelling (AUD/L)" type="number" register={register} errors={errors} />
                        <Input id="finesAdminFee" label="Fine admin fee (AUD)" type="number" register={register} errors={errors} />
                        <Input id="roadsideAssistanceProvider" label="Roadside assistance provider" register={register} errors={errors} />
                    </div>
                    <OptionSelector label="Deposit hold method" options={DEPOSIT_HOLD_OPTIONS} value={watch("depositHoldMethod") as string} onChange={(v) => setValue("depositHoldMethod", v)} allowDeselect />
                    <OptionSelector label="Tolls" columns={3} options={TOLL_HANDLING_OPTIONS} value={watch("tollHandling") as string} onChange={(v) => setValue("tollHandling", v)} allowDeselect />
                    <ToggleRow title="Roadside assistance included" value={!!watch("roadsideAssistanceIncluded")} onChange={(v) => setValue("roadsideAssistanceIncluded", v)} />
                </div>

                {categorySpecGroup(watch("category") as string) === "UTE" && (
                    <div className="mb-8 space-y-5">
                        <p className="font-semibold text-ink">Ute &amp; towing</p>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input id="payloadKg" label="Payload (kg)" type="number" register={register} errors={errors} />
                            <Input id="gvmKg" label="GVM (kg)" type="number" register={register} errors={errors} />
                            <Input id="towingCapacityBrakedKg" label="Towing — braked (kg)" type="number" register={register} errors={errors} />
                            <Input id="towingCapacityUnbrakedKg" label="Towing — unbraked (kg)" type="number" register={register} errors={errors} />
                            <Input id="trayLengthMm" label="Tray length (mm)" type="number" register={register} errors={errors} />
                            <Input id="trayWidthMm" label="Tray width (mm)" type="number" register={register} errors={errors} />
                        </div>
                        <ToggleRow title="Tow bar fitted" value={!!watch("towBarFitted")} onChange={(v) => setValue("towBarFitted", v)} />
                        <ToggleRow title="Canopy fitted" value={!!watch("canopyFitted")} onChange={(v) => setValue("canopyFitted", v)} />
                    </div>
                )}

                {categorySpecGroup(watch("category") as string) === "VAN" && (
                    <div className="mb-8 space-y-5">
                        <p className="font-semibold text-ink">Cargo</p>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input id="loadVolumeCubicMetres" label="Load volume (m³)" type="number" register={register} errors={errors} />
                            <Input id="loadLengthMm" label="Load length (mm)" type="number" register={register} errors={errors} />
                            <Input id="internalHeightMm" label="Internal height (mm)" type="number" register={register} errors={errors} />
                        </div>
                        <ToggleRow title="Ply-lined" value={!!watch("plyLined")} onChange={(v) => setValue("plyLined", v)} />
                    </div>
                )}

                {categorySpecGroup(watch("category") as string) === "CAMPER" && (
                    <div className="mb-8 space-y-5">
                        <p className="font-semibold text-ink">Camp &amp; touring setup</p>
                        <Input id="sleepingConfiguration" label="Sleeping configuration" register={register} errors={errors} />
                        <Input id="bedDimensions" label="Main bed dimensions" register={register} errors={errors} />
                        <Input id="selfContainedCertNumber" label="Self-contained certification number" register={register} errors={errors} />
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Input id="freshWaterLitres" label="Fresh water (L)" type="number" register={register} errors={errors} />
                            <Input id="greyWaterLitres" label="Grey water (L)" type="number" register={register} errors={errors} />
                            <Input id="gasBottleKg" label="Gas bottle (kg)" type="number" register={register} errors={errors} />
                            <Input id="solarWatts" label="Solar (W)" type="number" register={register} errors={errors} />
                            <Input id="houseBatteryAmpHours" label="House battery (Ah)" type="number" register={register} errors={errors} />
                        </div>
                        <OptionSelector label="Shower" columns={3} options={SHOWER_TYPE_OPTIONS} value={watch("showerType") as string} onChange={(v) => setValue("showerType", v)} allowDeselect />
                        <OptionSelector label="Toilet" options={TOILET_TYPE_OPTIONS} value={watch("toiletType") as string} onChange={(v) => setValue("toiletType", v)} allowDeselect />
                        <Input id="towVehicleRequirements" label="Tow vehicle requirements" register={register} errors={errors} />
                        <ToggleRow title="Self-contained certified" value={!!watch("selfContained")} onChange={(v) => setValue("selfContained", v)} />
                        <ToggleRow title="Awning fitted" value={!!watch("awningFitted")} onChange={(v) => setValue("awningFitted", v)} />
                        <ToggleRow title="Requires a special licence to drive" value={!!watch("requiresSpecialLicence")} onChange={(v) => setValue("requiresSpecialLicence", v)} />
                    </div>
                )}

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
            <div className="mt-5">
                <CalendarSyncPanel listingId={listingId} />
            </div>
            </div>
        </div>
        </main>
    );
};

export default EditUtilityPage;
