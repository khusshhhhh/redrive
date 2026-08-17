"use client";

import qs from "query-string";
import { useRouter, useSearchParams } from "next/navigation";
import { Range } from "react-date-range";
import { useCallback, useState } from "react";
import { formatISO } from "date-fns";
import useSearchModal from "@/app/hooks/useSearchModal";
import Calendar from "../inputs/Calender";
import Counter from "../inputs/Counter";
import Modal from "./Modal";
import StateSelector, { states as AU_STATES } from "../inputs/StateSelector";
import SuburbSelector, { type SuburbOption } from "../inputs/SuburbSelector";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField"; // ✅ Import Input Fields

const SearchModal = () => {
    const router = useRouter();
    const params = useSearchParams();
    const searchModal = useSearchModal();

    // ✅ Retrieve selected state from URL params (default: "Anywhere")
    const existingState = params?.get("state") || "Anywhere";
    const existingSuburb = params?.get("suburb") || "";

    // ✅ Search Filters State
    const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(
        existingState !== "Anywhere"
            ? AU_STATES.find((item) => item.value === existingState) || { value: existingState, label: existingState }
            : null
    );
    const [selectedSuburb, setSelectedSuburb] = useState<SuburbOption | null>(
        existingSuburb
            ? { value: existingSuburb, label: existingSuburb, state: existingState !== "Anywhere" ? existingState : undefined }
            : null
    );

    const [guestCount, setGuestCount] = useState(0);
    const [sleepCount, setSleepCount] = useState(0);
    const [dateRange, setDateRange] = useState<Range>({
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
    });

    // ✅ Price Range State (Min & Max Inputs)
    const [priceRange, setPriceRange] = useState<number[]>([100, 5000]); // Default Min: 100, Max: 5000

    // ✅ Synchronize Slider & Input Fields
    const handlePriceChange = (_event: Event, newValue: number | number[]) => {
        setPriceRange(newValue as number[]);
    };

    const handleMinPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newMin = Number(event.target.value);
        if (newMin >= 50 && newMin <= priceRange[1]) {
            setPriceRange([newMin, priceRange[1]]);
        }
    };

    const handleMaxPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newMax = Number(event.target.value);
        if (newMax >= priceRange[0] && newMax <= 10000) {
            setPriceRange([priceRange[0], newMax]);
        }
    };

    // ✅ Submit Search Query
    const onSubmit = useCallback(async () => {
        let currentQuery = {};

        if (params) {
            currentQuery = qs.parse(params.toString());
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedQuery: any = {
            ...currentQuery,
            state: selectedState?.value || undefined,
            suburb: selectedSuburb?.value || undefined,
            guestCount,
            sleepCount,
            minPrice: priceRange[0],
            maxPrice: priceRange[1],
        };

        if (dateRange.startDate) {
            updatedQuery.startDate = formatISO(dateRange.startDate);
        }

        if (dateRange.endDate) {
            updatedQuery.endDate = formatISO(dateRange.endDate);
        }

        const url = qs.stringifyUrl(
            {
                url: "/",
                query: updatedQuery,
            },
            { skipNull: true, skipEmptyString: true }
        );

        searchModal.onClose();
        router.push(url);
    }, [searchModal, selectedState, selectedSuburb, router, guestCount, sleepCount, dateRange, priceRange, params]);

    return (
        <Modal
            isOpen={searchModal.isOpen}
            onClose={searchModal.onClose}
            onSubmit={onSubmit}
            title="Search Utility"
            actionLabel="Search"
            body={
                <div className="flex flex-col gap-10">
                    {/* Optional location filters */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <div className="text-lg font-bold">Choose a location <span className="text-base font-normal text-muted">(Optional)</span></div>
                            <div className="text-base text-muted font-light">Search Australia-wide, or narrow results by state and suburb.</div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-ink">State</label>
                                <StateSelector
                                    value={selectedState || undefined}
                                    onChange={(state) => {
                                        setSelectedState(state);
                                        if (selectedSuburb?.state && selectedSuburb.state !== state.value) {
                                            setSelectedSuburb(null);
                                        }
                                    }}
                                    onClear={() => setSelectedState(null)}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-ink">Suburb</label>
                                <SuburbSelector
                                    state={selectedState?.value}
                                    value={selectedSuburb || undefined}
                                    onChange={(suburb) => {
                                        setSelectedSuburb(suburb);
                                        if (!selectedState && suburb.state) {
                                            const state = AU_STATES.find((item) => item.value === suburb.state);
                                            if (state) setSelectedState(state);
                                        }
                                    }}
                                    onClear={() => setSelectedSuburb(null)}
                                    allowAllStates={!selectedState}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="text-base text-muted font-light">
                                Selected Location:{" "}
                                <span className="font-medium">
                                    {selectedSuburb
                                        ? `${selectedSuburb.value}${selectedState ? `, ${selectedState.value}` : ""}`
                                        : selectedState?.label || "Anywhere"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <hr />
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <div className="text-lg font-bold">Booking Dates</div>
                            <div className="text-base font-light text-muted">When is the best time to go!</div>
                        </div>
                        <Calendar value={dateRange} onChange={(value) => setDateRange(value.selection)} />

                    </div>
                    <hr />
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <div className="text-lg font-bold">Number of people</div>
                            <div className="text-base font-light text-muted">Make sure they are free on those dates!</div>
                        </div>
                        <Counter title="People" subtitle="How many people are coming?" value={guestCount} onChange={setGuestCount} />
                        <Counter title="Sleep Spaces" subtitle="How many sleep spaces do you need?" value={sleepCount} onChange={setSleepCount} />
                    </div>
                    <hr />
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <div className="text-lg font-bold">Price per day</div>
                            <div className="text-base font-light text-muted">It is okay to set your budget!</div>
                        </div>
                        <div className="pt-4 pb-3 px-4 bg-surface-soft rounded-sm">
                            <Slider
                                value={priceRange}
                                onChange={handlePriceChange}
                                valueLabelDisplay="auto"
                                min={50}
                                max={10000}
                                step={50}
                                sx={{
                                    color: "#087985", // Coast and Country primary
                                    "& .MuiSlider-thumb": {
                                        backgroundColor: "#087985",
                                    },
                                    "& .MuiSlider-track": {
                                        backgroundColor: "#087985",
                                    },
                                    "& .MuiSlider-rail": {
                                        backgroundColor: "#D2E6E0",
                                    },
                                }}
                            />
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <TextField
                                label="Min Price (AUD)"
                                type="number"
                                value={priceRange[0]}
                                onChange={handleMinPriceChange}
                                inputProps={{ min: 50, max: priceRange[1], step: 50 }}
                                size="small"
                                sx={{ width: "48%" }}
                            />
                            <TextField
                                label="Max Price (AUD)"
                                type="number"
                                value={priceRange[1]}
                                onChange={handleMaxPriceChange}
                                inputProps={{ min: priceRange[0], max: 10000, step: 50 }}
                                size="small"
                                sx={{ width: "48%" }}
                            />
                        </div>
                    </div>
                </div>
            }
        />
    );
};

export default SearchModal;
