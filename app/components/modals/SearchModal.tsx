'use client';

import qs from "query-string";
import { useRouter, useSearchParams } from "next/navigation";
import { Range } from "react-date-range";
import { useCallback, useMemo, useState } from "react";
import { formatISO } from "date-fns";
import CountrySelect, { CountrySelectValue } from "../inputs/CountrySelect";

import useSearchModal from "@/app/hooks/useSearchModal";
import dynamic from "next/dynamic";
import Heading from "../Heading";
import Calendar from "../inputs/Calender";
import Counter from "../inputs/Counter";
import Modal from "./Modal";

enum STEPS {
    LOCATION = 0,
    DATE = 1,
    INFO = 2
}

const SearchModal = () => {
    const router = useRouter();
    const params = useSearchParams();
    const searchModal = useSearchModal();

    const [location, setLocation] = useState<CountrySelectValue>()
    const [step, setStep] = useState(STEPS.LOCATION);
    const [guestCount, setGuestCount] = useState(1);
    const [sleepCount, setSleepCount] = useState(1);
    const [dateRange, setDateRange] = useState<Range>({
        startDate: new Date(),
        endDate: new Date(),
        key: 'selection'
    });

    const Map = useMemo(() => dynamic(() => import("../Map"), {
        ssr: false,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [location]);

    const onBack = useCallback(() => {
        setStep((value) => value - 1);
    }, []);

    const onNext = useCallback(() => {
        setStep((value) => value + 1);
    }, []);

    const onSubmit = useCallback(async () => {
        if (step !== STEPS.INFO) {
            return onNext();
        }

        let currentQuery = {};

        if (params) {
            currentQuery = qs.parse(params.toString());
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedQuery: any = {
            ...currentQuery,
            locationValue: location?.value,
            guestCount,
            sleepCount
        };

        if (dateRange.startDate) {
            updatedQuery.startDate = formatISO(dateRange.startDate);
        }

        if (dateRange.endDate) {
            updatedQuery.endDate = formatISO(dateRange.endDate);
        }

        const url = qs.stringifyUrl({
            url: '/',
            query: updatedQuery
        }, { skipNull: true });

        setStep(STEPS.LOCATION);
        searchModal.onClose();

        router.push(url);
    },
        [
            step,
            searchModal,
            location,
            router,
            guestCount,
            sleepCount,
            dateRange,
            onNext,
            params
        ]);

    const actionLabel = useMemo(() => {
        if (step === STEPS.INFO) {
            return 'Search';
        }
        return 'Next';
    }, [step]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.LOCATION) {
            return undefined;
        }
        return 'Back';
    }, [step]);

    let bodyContent = (
        <div className="flex flex-col gap-8">
            <Heading
                title="Where do you wanna go?"
                subtitle="Find the perfect location!"
            />
            <CountrySelect
                value={location}
                onChange={(value) => setLocation(value as CountrySelectValue)}
            />
            <hr />
            <Map center={location?.latlng} />
        </div>
    );

    if (step === STEPS.DATE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="When do you plan to book?"
                    subtitle="Make sure everyone is free!"
                />
                <Calendar
                    value={dateRange}
                    onChange={(value) => setDateRange(value.selection)}
                />
            </div>
        );
    }

    if (step === STEPS.INFO) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="More information"
                    subtitle="Find your perfect thing!"
                />
                <Counter
                    title="People"
                    subtitle="How many people are coming?"
                    value={guestCount}
                    onChange={(value) => setGuestCount(value)}
                />
                <Counter
                    title="Sleep Space"
                    subtitle="How many sleep space do you need?"
                    value={sleepCount}
                    onChange={(value) => setSleepCount(value)}
                />
            </div>
        );
    }


    return (
        <Modal
            isOpen={searchModal.isOpen}
            onClose={searchModal.onClose}
            onSubmit={onSubmit}
            title="Search Utility"
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step == STEPS.LOCATION ? undefined : onBack}
            body={bodyContent}
        />
    );
};

export default SearchModal;
