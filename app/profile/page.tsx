"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Input from "@/app/components/inputs/Input";
import Button from "@/app/components/Button";
import Avatar from "@/app/components/Avatar";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { FaCheck } from "react-icons/fa";

interface ProfileFormData {
    name: string;
    email: string;
    number: string;
    streetAddress: string;
    city: string;
    state: string;
    postcode: string;
    hobbies: string;
    profileVerified: string;
    dreamDestinations: string;
}

export default function Profile() {
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProfileFormData>();
    const [image, setImage] = useState<string>("/images/placeholder.png");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [userName, setUserName] = useState<string | null>(null); // Store user name
    const [profileVerified, setProfileVerified] = useState<string>("N"); // ✅ Fixed missing state

    const [cityInput, setCityInput] = useState<string>("");
    const [suggestedCities, setSuggestedCities] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);

    useEffect(() => {
        async function fetchUserData() {
            setIsLoading(true);
            try {
                const response = await axios.get("/api/auth/user"); // Fetch from new API route


                if (response.data) {
                    setUserName(response.data.name || "User"); // Set the name in state
                    setProfileVerified(response.data.profileVerified || "N"); // ✅ Fix: Ensure profileVerified is stored in state
                    reset({
                        name: response.data.name || "",
                        email: response.data.email || "",
                        number: response.data.number || "",
                        streetAddress: response.data.streetAddress || "",
                        city: response.data.city || "",
                        state: response.data.state || "",
                        postcode: response.data.postcode || "",
                        hobbies: response.data.hobbies?.join(", ") || "",
                        dreamDestinations: response.data.dreamDestinations?.join(", ") || "",
                        profileVerified: response.data.profileVerified || "N", // ✅ Fixed missing state
                    });
                    setImage(response.data.image || "/images/placeholder.png");
                }
            } catch (error) {
                toast.error("Error fetching user data.");
                console.error("Error fetching user:", error);
            }
            setIsLoading(false);
        }

        fetchUserData();
    }, [reset]);

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

    const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
        setIsSaving(true);

        const updatedData = {
            ...data,
            hobbies: data.hobbies ? data.hobbies.split(",").map((h) => h.trim()) : [],
            dreamDestinations: data.dreamDestinations ? data.dreamDestinations.split(",").map((d) => d.trim()) : [],
            image,
            profileVerified,
        };

        try {
            await axios.put("/api/profile", updatedData);
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error("Error updating profile.");
            console.error("Error updating profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {/* Toast Notification Container */}
            <div>
                <Toaster />
            </div>

            {isLoading ? (
                <div className="text-center mt-10">Loading profile...</div>
            ) : (
                <div className="max-w-2xl mx-auto p-6 bg-white mt-10">
                    <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
                        Hey, {userName}
                        {profileVerified === "Y" && <FaCheck className="text-teal-500" size={20} />}
                    </h2>

                    <div className="flex flex-col items-center mb-6">
                        <label htmlFor="profileImage" className="cursor-pointer">
                            <Avatar src={image} size={80} />
                        </label>
                        <input type="file" id="profileImage" accept="image/*" className="hidden" />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col mb-8">
                            <div className="mt-8">
                                <h4 className="text-xl font-semibold">Basic Information</h4>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="text-sm text-gray-600">Name</label>
                                    <Input id="name" label="" register={register} required errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Email</label>
                                    <Input id="email" label="" register={register} disabled errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Mobile Number</label>
                                    <Input id="number" label="" placeholder="+61 xxx xxx xxx" register={register} required errors={errors} />
                                </div>
                            </div>
                        </div>
                        {/* <hr className="border-[1px] " /> */}
                        <div className="flex flex-col mt-8">
                            <div>
                                <h4 className="text-xl font-semibold">Address</h4>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="text-sm text-gray-600">Address Line</label>
                                    <Input id="streetAddress" label="" register={register} errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">City</label>
                                    <Input id="city" label="" register={register} errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">State</label>
                                    <Input id="state" label="" register={register} errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Postcode</label>
                                    <Input id="postcode" label="" register={register} errors={errors} />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col mt-8">
                            <div>
                                <h4 className="text-xl font-semibold">Tell us something!</h4>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="text-sm text-gray-600">Hobbies</label>
                                    <Input id="hobbies" label="" register={register} errors={errors} />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Dream Places to Visit</label>
                                    <input
                                        type="text"
                                        value={cityInput}
                                        onChange={(e) => setCityInput(e.target.value)}
                                        placeholder="Select cities..."
                                        className="w-full mb-4 p-4 border-neutral-300 border-[2px] rounded-md mt-1"
                                    />
                                    {/* Show Suggestions */}
                                    {suggestedCities.length > 0 && (
                                        <ul className="border mt-1 bg-white shadow-lg max-h-40 overflow-auto rounded-md">
                                            {suggestedCities.map((city, index) => (
                                                <li
                                                    key={index}
                                                    className="p-2 hover:bg-gray-200 cursor-pointer"
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
                                            <div key={index} className="bg-teal-100 px-3 py-1 rounded-full flex items-center">
                                                {city}
                                                <button
                                                    onClick={() => removeCity(city)}
                                                    className="ml-2 text-red-500"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex w-full justify-end">
                            <Button type="submit" label={isSaving ? "Saving..." : "Save Changes"} disabled={isSaving} />
                        </div>

                    </form>
                </div>
            )}
        </>
    );
}