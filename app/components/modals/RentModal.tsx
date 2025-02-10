'use client';

import useRentModal from "@/app/hooks/useRentModal";

import CategoryInput from "../inputs/CategoryInput";
import CountrySelect from "../inputs/CountrySelect";
import Counter from "../inputs/Counter";
import ImageUpload from "../inputs/ImageUpload";

import Modal from "./Modal";
import Heading from "../Heading";
import dynamic from "next/dynamic";

import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { categories } from "../navbar/Categories";
import Input from "../inputs/Input";
import YearSelect from "../inputs/YearSelect";
import FuelSelector from "../inputs/FuelSelector";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

enum STEPS {
    CATEGORY = 0,
    LOCATION = 1,
    INFO = 2,
    IMAGES = 3,
    DESCRIPTION = 4,
    PRICE = 5
}

const RentModal = () => {
    const router = useRouter();
    const rentModal = useRentModal();

    const [step, setStep] = useState(STEPS.CATEGORY);
    const [isLoading, setIsLoading] = useState(false);

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
            location: null,
            guestCount: 0,
            doorCount: 0,
            sleepCount: 0,
            fuelType: '',
            year: '',
            imageSrc: '',
            price: 1,
            title: '',
            description: '',
            company: '',
            modal: '',
        }
    });

    const category = watch('category');
    const location = watch('location');
    const guestCount = watch('guestCount');
    const doorCount = watch('doorCount');
    const sleepCount = watch('sleepCount');
    const imageSrc = watch('imageSrc');

    const Map = useMemo(() => dynamic(() => import('../Map'), {
        ssr: false
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [location]);

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

        console.log("Submitting data:", data);

        if (step !== STEPS.PRICE) {
            return onNext();
        }

        setIsLoading(true);

        axios.post('/api/listings', data, {
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
        if (step === STEPS.PRICE) {
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
                <CountrySelect
                    value={location}
                    onChange={(value) => setCustomValue('location', value)}
                />
                <Map center={location?.latlng} />
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
                <Heading
                    title="Add a photo of your utility"
                    subtitle="Show people what it looks like!"
                />
                <ImageUpload
                    value={imageSrc}
                    onChange={(value) => setCustomValue('imageSrc', value)}
                />
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
                <Input
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
                    register={register}
                    errors={errors}
                    required
                />
                <hr />
                <FuelSelector
                    id="fuelType"
                    label="Fuel Type"
                    disabled={isLoading}
                    register={register}
                    setValue={setValue}
                    errors={errors}
                    required
                />

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
