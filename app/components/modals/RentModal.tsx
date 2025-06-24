'use client';

import useRentModal from "@/app/hooks/useRentModal";
import Modal from "./Modal";

import CategoryInput from "../inputs/CategoryInput";
// import CountrySelect from "../inputs/CountrySelect";
import Input from "../inputs/Input";
import YearSelect from "../inputs/YearSelect";
import FuelSelector from "../inputs/FuelSelector";
import Counter from "../inputs/Counter";
import AmenitiesSelector from "../inputs/AmenitiesSelector";
// import ImageUpload from "../inputs/ImageUpload";
import Heading from "../Heading";
import TextArea from "../inputs/TextArea";
import StateSelector from "../inputs/StateSelector";
import SuburbSelector from "../inputs/SuburbSelector";
import DateSelector from "../inputs/DateSelector";
import DriveChainSelector from "../inputs/DriveChainSelector";


import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { categories } from "../navbar/Categories";
import { useRouter } from "next/navigation";
import { useCloudinaryUpload } from "@/app/hooks/useCloudinaryUpload";
import Image from "next/image";


// Declare google property on window object
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        google: any;
    }
}
import axios from "axios";
import toast from "react-hot-toast";
import { IconX } from "@tabler/icons-react";


enum STEPS {
    CATEGORY = 0,
    LOCATION = 1,
    INFO = 2,
    IMAGES = 3,
    DESCRIPTION = 4,
    INFORMATION = 5,
    AMENITIES = 6,
    LEGAL = 7,
    PRICE = 8,
    CLEANING = 9,
}

const RentModal = () => {
    const router = useRouter();
    const rentModal = useRentModal();

    const [step, setStep] = useState(STEPS.CATEGORY);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(null);
    const [selectedSuburb, setSelectedSuburb] = useState<{ value: string; label: string } | null>(null);
    const [address, setAddress] = useState<string>("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { uploadImage, loading } = useCloudinaryUpload();
    const [imageSrcs, setImageSrcs] = useState<string[]>([]);
    const [regoImage, setRegoImage] = useState<string>("");
    const [uploading, setUploading] = useState(false); // ✅ Uploading State
    const [uploadingRego, setUploadingRego] = useState(false);

    // ✅ Remove an Image from State
    const removeImage = (indexToRemove: number) => {
        setImageSrcs((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    // ✅ Handle Image Upload via API
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const uploadImageToCloudinary = async (file: File, folder: string) => {
        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            return data.url || null;
        } catch (error) {
            console.error("Cloudinary Upload Error:", error);
            return null;
        }
    };


    // ✅ Handle Listing Image Upload (Max 10)
    const handleListingImages = async (files: FileList) => {
        if (!files.length) return;

        setUploading(true); // ✅ Show Loading

        const urls = await Promise.all(
            [...files].slice(0, 10).map(async (file) => {
                const url = await uploadImageToCloudinary(file, "listings");
                return url;
            })
        );

        if (urls.length) {
            setImageSrcs((prev) => [...prev, ...urls].slice(0, 10));
        }

        setUploading(false); // ✅ Hide Loading
    };

    // ✅ Function to Upload Rego Image to Cloudinary
    const handleRegoImage = async (file: File) => {
        if (!file) return;

        setUploadingRego(true);

        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.url) {
                setRegoImage(data.url);
            } else {
                console.error("Error uploading image:", data.error);
            }
        } catch (error) {
            console.error("Upload failed:", error);
        }

        setUploadingRego(false);
    };

    // ✅ Function to Remove Uploaded Rego Image
    const removeRegoImage = () => {
        setRegoImage(""); // Reset the state
    };

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: {
            errors,
        },
        reset
    } = useForm<FieldValues>({
        defaultValues: {
            category: '',
            state: '',
            suburb: '',
            address: '',
            guestCount: 0,
            doorCount: 0,
            sleepCount: 0,
            fuelType: '',
            fuelEconomy: '',
            driveChain: '',
            year: '',
            price: 1,
            title: '',
            description: '',
            information: '',
            company: '',
            modal: '',
            regoNumber: '',
            regoEndDate: new Date(),
            badge: null, // ✅ Ensure badge is included and set to null
            imageSrcs: [], // ✅ Prevents errors from undefined imageSrcs
            amenities: [], // ✅ Ensures amenities are an empty array by default
            regoImage: '', // ✅ Ensures regoImage is an empty string instead of undefined
            cleaningFeeOption: 'NO',
            cleaningFeeAmount: '',
            returnCleaningFeeAmount: '',
        }
    });

    const category = watch('category');
    // const location = watch('location');
    const guestCount = watch('guestCount');
    const doorCount = watch('doorCount');
    const sleepCount = watch('sleepCount');
    // const regoNumber = watch('regoNumber');
    const regoEndDate = watch('regoEndDate');
    const cleaningFeeOption = watch('cleaningFeeOption');
    const cleaningFeeAmount = watch('cleaningFeeAmount');
    const returnCleaningFeeAmount = watch('returnCleaningFeeAmount');

    const Map = useMemo(
        () => dynamic(() => import('../Map'), { ssr: false }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedState, selectedSuburb]
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setCustomValue = (id: string, value: any) => {
        setValue(id, value, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
        });
    };


    const onBack = () => {
        setStep((value) => value - 1);
    };

    const onNext = () => {
        setStep((value) => value + 1);
    };

    const onSubmit: SubmitHandler<FieldValues> = (data) => {

        if (step !== STEPS.CLEANING) {
            return onNext();
        }

        setIsLoading(true);

        const finalData = {
            ...data,
            imageSrcs,
            regoImage,
            state: selectedState?.value,
            suburb: selectedSuburb?.value,
            address: address.trim() !== "" ? address : "Unknown",
            // ✅ use the submitted form values directly
            cleaningFeeOption: data.cleaningFeeOption,
            cleaningFeeAmount: data.cleaningFeeAmount || null,
            returnCleaningFeeAmount: data.returnCleaningFeeAmount || null,
        };

        axios.post('/api/listings', finalData, {
            headers: {
                "Content-Type": "application/json" // ✅ Ensure JSON format
            }
        })
            .then(() => {
                toast.success('Listing Created!');
                router.refresh();
                reset();
                setStep(STEPS.CATEGORY);
                rentModal.onClose();
            })
            .catch((error) => {
                console.error("Error creating listing:", error); // ✅ Log the error for debugging
                toast.error("Something went wrong.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    };


    const actionLabel = useMemo(() => {
        if (step === STEPS.CLEANING) {
            return 'Create';
        }

        return 'Next';
    }, [step]);

    const secondaryActionLabel = useMemo(() => {
        if (step == STEPS.CATEGORY) {
            return undefined;
        }

        return 'Back';
    }, [step]);

    let bodyContent = (
        <div className="flex flex-col gap-8">
            <Heading
                title="Which of these best describes your utility?"
                subtitle="Pick a category"
            />
            <div
                className="
              grid
              grid-cols-1
              md:grid-cols-2
              gap-3
              max-h-[50vh]
              overflow-y-auto
            "
            >
                {categories.map((item) => (
                    <div key={item.label} className="col-span-1">
                        <CategoryInput
                            onClick={(category) =>
                                setCustomValue('category', category)}
                            selected={category == item.label}
                            label={item.label}
                            icon={item.icon}
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    if (step == STEPS.LOCATION) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Where is your utility located?"
                    subtitle="Help redrivers find you!"
                />
                <div className="flex flex-col gap-8">
                    {/* ✅ State Selector */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            State
                        </label>
                        <StateSelector
                            value={selectedState}
                            onChange={setSelectedState}
                        />
                    </div>

                    {/* ✅ Suburb Selector (Dynamically updates based on state) */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Suburb
                        </label>
                        <SuburbSelector
                            state={selectedState?.value}
                            value={selectedSuburb}
                            onChange={setSelectedSuburb}
                        />
                    </div>

                    {/* ✅ Google Places Autocomplete for Address */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Number & Street Address
                        </label>
                        <Input
                            id="address"
                            label="Street Address"
                            register={register}
                            errors={errors}
                            required
                            validate={(value) => value.trim() !== "" || "Address is required"} // ✅ Ensure non-empty value
                            onChange={(e) => setAddress(e.target.value)} // ✅ Keep Address in State
                        />

                    </div>

                    <Map suburb={selectedSuburb?.value} state={selectedState?.value} />

                </div>
            </div>
        );
    }

    if (step == STEPS.INFO) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Share some basics about your utility"
                    subtitle="What feature does it have?"
                />
                <Counter
                    title="People"
                    subtitle="How many people do you allowed?"
                    value={guestCount}
                    onChange={(value) => setCustomValue('guestCount', value)}
                />
                <hr />
                <Counter
                    title="Door"
                    subtitle="How many door does it have?"
                    value={doorCount}
                    onChange={(value) => setCustomValue('doorCount', value)}
                />
                <hr />
                <Counter
                    title="Sleeping Space"
                    subtitle="How many people are allowed to sleep?"
                    value={sleepCount}
                    onChange={(value) => setCustomValue('sleepCount', value)}
                />
            </div>
        );
    }

    if (step == STEPS.IMAGES) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading title="Add photos of your utility" subtitle="We recommand 5 to 10 photos." />

                {/* ✅ File Input */}
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleListingImages(e.target.files!)}
                    className="hidden"
                    id="listingImages"
                />
                <label
                    htmlFor="listingImages"
                    className="cursor-pointer p-4 border-2 border-dashed rounded-lg text-center text-gray-600"
                >
                    {uploading ? "Uploading..." : "Click to Upload Listing Images"}
                </label>

                {/* ✅ Show Uploading Spinner */}
                {uploading && (
                    <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-600"></div>
                    </div>
                )}

                {/* ✅ Display Uploaded Images with Delete Option */}
                {imageSrcs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 overflow-hidden">
                        {imageSrcs.map((src, index) => (
                            src ? (  // ✅ Only Render if src Exists
                                <div key={index} className="relative w-40 h-40 group">
                                    <Image
                                        alt={`Uploaded Image ${index + 1}`}
                                        src={src}
                                        width={160}
                                        height={160}
                                        className="object-cover rounded-lg"
                                    />
                                    {/* ✅ Delete Button Appears on Hover */}
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <IconX size={20} />
                                    </button>
                                </div>
                            ) : null
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (step == STEPS.DESCRIPTION) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="How would you describe your utility?"
                    subtitle="Short and sweet works best!"
                />
                <Input
                    id="title"
                    label="Title e.g, 'Powerful Ute in Adelaide'"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
                <TextArea
                    id="description"
                    label="Description in 100 words"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
                <hr />
                <Heading
                    title=""
                    subtitle="Provide the basic information!"
                />
                <div className="flex flex-col gap-8">
                    <Input
                        id="company"
                        label="Company e.g, 'Ford'"
                        disabled={isLoading}
                        register={register}
                        errors={errors}
                        required
                    />
                    <Input
                        id="modal"
                        label="Modal Name e.g, 'Raptor'"
                        disabled={isLoading}
                        register={register}
                        errors={errors}
                        required
                    />
                </div>
                <YearSelect
                    id="year"
                    label="Manufacturing Year"
                    disabled={isLoading}
                    setValue={setValue}
                    watch={watch}
                    register={register}
                    errors={errors}
                    required
                />
                <hr />
                <FuelSelector
                    id="fuelType"
                    label="Fuel Type"
                    disabled={isLoading}
                    watch={watch}
                    setValue={setValue}
                    errors={errors}
                    required
                />
                <DriveChainSelector
                    id="driveChain"
                    label="Drive Chain"
                    disabled={isLoading}
                    watch={watch}
                    setValue={setValue}
                    errors={errors}
                    required
                />
                <div>
                    <Input
                        id="fuelEconomy"
                        label="Fuel Economy (L/100km)"
                        type="number"
                        disabled={isLoading}
                        register={register}
                        errors={errors}
                        required={false}  // ✅ This field is optional
                    />
                </div>
            </div>
        );
    }

    if (step == STEPS.INFORMATION) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Share some more information"
                    subtitle="What else do people need to know? like, how to use it?, what to care and what not to do?"
                />
                <TextArea
                    id="information"
                    label="Information"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required />
            </div>
        );
    }

    if (step == STEPS.AMENITIES) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="What amenities does your utility offer?"
                    subtitle="Select all that apply."
                />
                <AmenitiesSelector
                    register={register}
                    errors={errors}
                    setValue={setValue}
                />
            </div>
        );
    }

    if (step === STEPS.LEGAL) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading title="Legal Information" subtitle="Provide your utility registration details." />

                {/* ✅ Registration Number Input */}
                <Input
                    id="regoNumber"
                    label="Registration Number"
                    type="text"
                    maxLength={9}
                    placeholder="ABC123DEF"
                    register={register}
                    errors={errors}
                    required
                    onChange={(e) => setCustomValue("regoNumber", e.target.value.toUpperCase())}
                />

                {/* ✅ Registration Expiry Date */}
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Registration Expiry Date</label>
                    <div className="mt-4">
                        <DateSelector
                            value={regoEndDate}
                            onChange={(value) => setCustomValue("regoEndDate", value)}
                        />
                    </div>
                </div>

                {/* ✅ File Input for Legal Document */}
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleRegoImage(e.target.files![0])}
                    className="hidden"
                    id="regoDocument"
                />
                <label htmlFor="regoDocument" className="cursor-pointer p-4 border-2 border-dashed rounded-lg text-center text-gray-600">
                    {uploadingRego ? "Uploading..." : "Click to Upload Legal Document"}
                </label>

                {/* ✅ Show Uploading Spinner */}
                {uploadingRego && (
                    <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-600"></div>
                    </div>
                )}

                {/* ✅ Show Uploaded Legal Document with Delete Option */}
                {regoImage && (
                    <div className="mt-4 relative overflow-hidden w-60 h-60">
                        <Image alt="Legal Document" src={regoImage} width={240} height={240} className="object-cover rounded-lg" />
                        {/* ✅ Delete Button */}
                        <button
                            onClick={removeRegoImage}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-100 hover:opacity-80 transition"
                        >
                            <IconX size={20} />
                        </button>
                    </div>
                )}
            </div>
        );
    }



    if (step === STEPS.PRICE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Now, set your price!!"
                    subtitle="How much willing to get per day?"
                />
                <Input
                    id="price"
                    label="Price"
                    formatPrice
                    type="number"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
            </div>
        );
    }

    if (step === STEPS.CLEANING) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Cleaning Fees"
                    subtitle="Do you want charge the customer for cleaning fees?"
                />
                <div className="flex flex-col gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            value="YES"
                            checked={cleaningFeeOption === 'YES'}
                            onChange={() => setCustomValue('cleaningFeeOption', 'YES')}
                        />
                        Yes
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            value="NO"
                            checked={cleaningFeeOption === 'NO'}
                            onChange={() => setCustomValue('cleaningFeeOption', 'NO')}
                        />
                        No
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            value="UPON_RETURNING"
                            checked={cleaningFeeOption === 'UPON_RETURNING'}
                            onChange={() => setCustomValue('cleaningFeeOption', 'UPON_RETURNING')}
                        />
                        Upon Returning
                    </label>
                </div>
                {cleaningFeeOption === 'YES' && (
                    <Input
                        id="cleaningFeeAmount"
                        label="Cleaning Fee (AUD)"
                        type="number"
                        register={register}
                        errors={errors}
                        disabled={isLoading}
                        required
                    />
                )}
                {cleaningFeeOption === 'UPON_RETURNING' && (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-neutral-600">
                            User can add desired amount to charge when the utility is returned.
                        </p>
                        <Input
                            id="returnCleaningFeeAmount"
                            label="Amount on Return (AUD)"
                            type="number"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                            required
                        />
                    </div>
                )}
            </div>
        );
    }




    return (
        <Modal
            isOpen={rentModal.isOpen}
            onClose={rentModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step == STEPS.CATEGORY ? undefined : onBack}
            title="Redrive your utilities!!"
            body={bodyContent}
        />
    );
};

export default RentModal;
