/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "@/app/components/inputs/Input";
import AddressAutocomplete, { ParsedAddress } from "@/app/components/inputs/AddressAutocomplete";
import Button from "@/app/components/Button";
import axios from "axios";
import ImageUpload from "../components/inputs/ImageUpload";
import { toast, Toaster } from "react-hot-toast";
import { FaCheck } from "react-icons/fa";
import SuburbSelector from "../components/inputs/SuburbSelector";
import StateSelector, { states as AU_STATES } from "../components/inputs/StateSelector";

interface ProfileFormData {
    name: string;
    email: string;
    number: string;
    streetAddress: string;
    suburb: string;
    state: string;
    postcode: string;
    hobbies: string;
    profileVerified: string;
    dreamDestinations: string;
    licenseImage: string;
    licenseType: string;
}

export default function Profile() {
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormData>();
    const [image, setImage] = useState<string>("/images/placeholder.png");
    const [licenseImage, setLicenseImage] = useState<string>("");
    const [licenseType, setLicenseType] = useState<string>("Driver's License");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [cityInput, setCityInput] = useState<string>("");
    const [suggestedCities, setSuggestedCities] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [userName, setUserName] = useState<string | null>(null);
    const [profileVerified, setProfileVerified] = useState<string>("N");
    const [triggerUpload, setTriggerUpload] = useState<boolean>(false);
    const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(null);
    const [selectedSuburb, setSelectedSuburb] = useState<{ value: string; label: string; postcode?: number } | null>(null);

    useEffect(() => {
        async function fetchUserData() {
            setIsLoading(true);
            try {
                const response = await axios.get("/api/auth/user");

                if (response.status === 200 && response.data) {

                    setUserName(response.data.name || "User");
                    setProfileVerified(response.data.profileVerified || "N");
                    setImage(response.data.image || "/images/placeholder.png");
                    setLicenseImage(response.data.licenseImage || "");
                    setLicenseType(response.data.licenseType || "Driver's License");

                    // ✅ Use `setValue()` instead of `reset()`
                    setValue("name", response.data.name || "");
                    setValue("email", response.data.email || "");
                    setValue("number", response.data.number || "");
                    setValue("streetAddress", response.data.streetAddress || "");
                    setValue("suburb", response.data.suburb || "");
                    setValue("state", response.data.state || "");
                    setValue("postcode", response.data.postcode || "");
                    setValue("hobbies", response.data.hobbies?.join(", ") || "");
                    setValue("dreamDestinations", response.data.dreamDestinations?.join(", ") || "");
                    setValue("profileVerified", response.data.profileVerified || "N");
                    setValue("licenseImage", response.data.licenseImage || "");
                    setValue("licenseType", response.data.licenseType || "Driver's License");

                    // ✅ Pre-fill state & suburb if data exists
                    if (response.data.state) {
                        setSelectedState({ value: response.data.state, label: response.data.state });
                        setValue("state", response.data.state);
                    }

                    if (response.data.suburb) {
                        setSelectedSuburb({
                            value: response.data.suburb,
                            label: `${response.data.suburb}, ${response.data.postcode || ""}`,
                            postcode: response.data.postcode
                        });
                        setValue("suburb", response.data.suburb);
                        setValue("postcode", response.data.postcode || "");
                    }
                } else {
                    console.error("❌ Failed to fetch user data:", response.data);
                    toast.error("Error loading profile data.");
                }
            } catch (error) {
                console.error("❌ Error fetching user:", error);
                toast.error("Error fetching user data.");
            }
            setIsLoading(false);
        }

        fetchUserData();
    }, [setValue]);

    // ✅ Handle form submission
    const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
        setIsSaving(true);

        const updatedData = {
            ...data,
            image,
            licenseImage,
            licenseType,
            profileVerified: licenseImage ? "Y" : profileVerified, // ✅ If license uploaded, mark verified
            hobbies: data.hobbies ? data.hobbies.split(",").map((h) => h.trim()) : [],
            dreamDestinations: data.dreamDestinations ? data.dreamDestinations.split(",").map((d) => d.trim()) : [],
        };

        try {
            await axios.put("/api/profile", updatedData);
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error("Error updating profile. Please try again.");
            console.error("❌ Error updating profile:", error);
        } finally {
            setIsSaving(false);
        }
    };


    // Fetch cities dynamically from an API when the user types
    useEffect(() => {
        if (cityInput.length > 2) {
            fetchCities(cityInput);
        } else {
            setSuggestedCities([]);
        }
    }, [cityInput]);

    const fetchCities = async (query: string) => {
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search?city=${query}&format=json&limit=5`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cities = response.data.map((place: any) => `${place.display_name}`);
            setSuggestedCities(cities);
        } catch (error) {
            console.error("Error fetching cities:", error);
        }
    };

    const addCity = (city: string) => {
        if (!selectedCities.includes(city)) {
            setSelectedCities([...selectedCities, city]);
            setValue("dreamDestinations", [...selectedCities, city].join(", ")); // Update form state
        }
        setCityInput(""); // Clear input after selection
        setSuggestedCities([]); // Hide suggestions
    };

    const removeCity = (city: string) => {
        const updatedCities = selectedCities.filter((c) => c !== city);
        setSelectedCities(updatedCities);
        setValue("dreamDestinations", updatedCities.join(", ")); // Update form state
    };

    // Auto-fills State/Suburb/Postcode from a Google Places selection alongside
    // the street address itself, so picking one suggestion fills the whole block.
    const onAddressSelect = (result: ParsedAddress) => {
        if (result.state) {
            const known = AU_STATES.find((s) => s.value === result.state);
            const stateOption = known || { value: result.state, label: result.state };
            setSelectedState(stateOption);
            setValue("state", stateOption.value);
        }
        if (result.suburb) {
            setSelectedSuburb({
                value: result.suburb,
                label: result.postcode ? `${result.suburb}, ${result.postcode}` : result.suburb,
                postcode: result.postcode ? Number(result.postcode) : undefined,
            });
            setValue("suburb", result.suburb);
            setValue("postcode", result.postcode || "");
        }
    };

    return (
        <>
            <Toaster />
            {isLoading ? (
                <div className="max-w-2xl mx-auto p-6 mt-10 space-y-6">
                    <div className="h-8 shimmer rounded w-1/3 mx-auto" />
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-[100px] h-[100px] rounded-full shimmer" />
                        <div className="h-4 w-1/2 shimmer rounded" />
                    </div>
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-4 shimmer rounded" />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto p-6 md:p-8 bg-white shadow-card rounded-md border border-hairline-soft my-10">
                    <h2 className="text-display-sm font-semibold mb-6 text-center text-ink flex items-center justify-center gap-2">
                        Hey, {userName}
                        {profileVerified === "Y" && <FaCheck className="text-ink" size={20} />}
                    </h2>

                    {/* ✅ Profile Image (Click to Change) */}
                    <div className="mb-6 flex flex-col items-center">
                        <h4 className="text-title-sm font-semibold mb-2 text-ink">Profile Picture</h4>
                        <div
                            className="w-[100px] h-[100px] rounded-full overflow-hidden border border-hairline cursor-pointer hover:opacity-80 transition"
                            onClick={() => setTriggerUpload(true)}
                        >
                            <img src={image} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        {triggerUpload && (
                            <ImageUpload onChange={(url) => { setImage(url); setTriggerUpload(false); }} value={image} triggerUpload />
                        )}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}>

                        {/* ✅ Basic Information */}
                        <div className="flex flex-col mb-8 gap-6">
                            <div>
                                <h4 className="text-display-md font-semibold text-ink">Basic Information</h4>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="text-sm text-muted">Name</label>
                                    <Input id="name" label="" register={register} required errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Email</label>
                                    <Input id="email" label="" register={register} disabled errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Phone Number</label>
                                    <Input id="number" label="" register={register} errors={errors} />
                                </div>
                            </div>
                        </div>

                        {/* ✅ Address Section with Select Inputs */}
                        <div className="flex flex-col mt-8">
                            <h4 className="text-display-md font-semibold text-ink">Address</h4>

                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="text-sm text-muted">Address Line</label>
                                    <AddressAutocomplete
                                        id="streetAddress"
                                        label=""
                                        register={register}
                                        setValue={setValue}
                                        errors={errors}
                                        onSelect={onAddressSelect}
                                    />
                                </div>

                                {/* ✅ State Selector */}
                                <div>
                                    <label className="text-sm text-muted">State</label>
                                    <StateSelector
                                        value={selectedState}
                                        onChange={(selected) => {
                                            setSelectedState(selected);
                                            setSelectedSuburb(null); // ✅ Reset suburb when state changes
                                            setValue("state", selected.value);
                                            setValue("suburb", "");
                                            setValue("postcode", "");
                                        }}
                                    />
                                </div>

                                {/* ✅ Suburb Selector */}
                                <div>
                                    <label className="text-sm text-muted">Suburb</label>
                                    <SuburbSelector
                                        state={selectedState?.value}
                                        value={selectedSuburb}
                                        onChange={(selected) => {
                                            setSelectedSuburb(selected);
                                            setValue("suburb", selected.value);
                                            setValue("postcode", selected.postcode?.toString() || "");
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-muted">Postcode</label>
                                    <Input id="postcode" label="" register={register} errors={errors} disabled />
                                </div>
                            </div>
                        </div>

                        {/* ✅ Hobbies */}

                        <div className="flex flex-col mt-8">
                            <div>
                                <h4 className="text-display-md font-semibold text-ink">Tell us something!</h4>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="text-sm text-muted">Hobbies</label>
                                    <Input id="hobbies" label="" register={register} errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Dream Places to Visit</label>
                                    <input
                                        type="text"
                                        value={cityInput}
                                        onChange={(e) => setCityInput(e.target.value)}
                                        placeholder="Select cities..."
                                        className="w-full mb-4 p-4 border-hairline border rounded-sm mt-1 focus:border-ink focus:border-2 outline-none text-ink"
                                    />
                                    {/* Show Suggestions */}
                                    {suggestedCities.length > 0 && (
                                        <ul className="border border-hairline mt-1 bg-white shadow-card max-h-40 overflow-auto rounded-sm">
                                            {suggestedCities.map((city, index) => (
                                                <li
                                                    key={index}
                                                    className="p-2 hover:shimmer cursor-pointer text-ink"
                                                    onClick={() => addCity(city)}
                                                >
                                                    {city}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {/* Selected Cities */}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedCities.map((city, index) => (
                                            <div key={index} className="bg-surface-strong text-ink px-3 py-1 rounded-full flex items-center">
                                                {city}
                                                <button
                                                    onClick={() => removeCity(city)}
                                                    className="ml-2 text-error"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ✅ License Verification */}
                        <div className="mt-8">
                            <h4 className="text-display-md font-semibold text-ink">License Verification</h4>
                            <select
                                value={licenseType}
                                onChange={(e) => setLicenseType(e.target.value)}
                                className="w-full p-4 border border-hairline rounded-sm mt-1 text-ink focus:border-ink focus:border-2 outline-none"
                            >
                                <option>Driver License</option>
                                <option>Boat License</option>
                                <option>Other License</option>
                            </select>

                            <div className="mt-4">
                                <ImageUpload onChange={setLicenseImage} value={licenseImage} />
                            </div>
                        </div>

                        <div className="flex w-full justify-end mt-6">
                            <Button type="submit" label="Save Changes" loading={isSaving} loadingLabel="Saving changes" />
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
