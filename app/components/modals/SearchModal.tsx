"use client";

import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import { formatISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useCallback, useEffect, useState } from "react";
import type { Range } from "react-date-range";
import { IconCalendar, IconCar, IconMapPin, IconUsers } from "@tabler/icons-react";

import useSearchModal from "@/app/hooks/useSearchModal";
import { saveLastSearch } from "@/app/hooks/useLastSearch";
import Calendar from "../inputs/Calender";
import Counter from "../inputs/Counter";
import StateSelector, { states as AU_STATES } from "../inputs/StateSelector";
import SuburbSelector, { type SuburbOption } from "../inputs/SuburbSelector";
import Modal from "./Modal";

const DRAFT_KEY = "redrive_search_draft";
const VEHICLE_TYPES = ["Car", "Utes", "Bikes", "Caravans", "Motorhomes", "Boats", "JetSkies", "Yachts", "Vans", "Trucks"];

interface SearchDraft {
  state?: string;
  suburb?: string;
  category?: string;
  guestCount?: number;
  sleepCount?: number;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
}

const readDraft = (): SearchDraft => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
};

const SearchModal = () => {
  const router = useRouter();
  const params = useSearchParams();
  const searchModal = useSearchModal();
  const [draft] = useState<SearchDraft>(readDraft);
  const [step, setStep] = useState(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);

  const existingState = params?.get("state") || "Anywhere";
  const stateValue = draft.state || (existingState !== "Anywhere" ? existingState : undefined);
  const suburbValue = draft.suburb || params?.get("suburb") || "";
  const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(
    stateValue ? AU_STATES.find((item) => item.value === stateValue) || { value: stateValue, label: stateValue } : null
  );
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbOption | null>(
    suburbValue ? { value: suburbValue, label: suburbValue, state: stateValue } : null
  );
  const [category, setCategory] = useState(draft.category || params?.get("category") || "");
  const [guestCount, setGuestCount] = useState(draft.guestCount ?? Number(params?.get("guestCount") || 0));
  const [sleepCount, setSleepCount] = useState(draft.sleepCount ?? Number(params?.get("sleepCount") || 0));
  const [dateRange, setDateRange] = useState<Range>({
    startDate: draft.startDate ? new Date(draft.startDate) : params?.get("startDate") ? new Date(params.get("startDate")!) : new Date(),
    endDate: draft.endDate ? new Date(draft.endDate) : params?.get("endDate") ? new Date(params.get("endDate")!) : new Date(),
    key: "selection",
  });
  const [priceRange, setPriceRange] = useState<number[]>([
    draft.minPrice ?? Number(params?.get("minPrice") || 100),
    draft.maxPrice ?? Number(params?.get("maxPrice") || 5000),
  ]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const next: SearchDraft = {
      state: selectedState?.value,
      suburb: selectedSuburb?.value,
      category: category || undefined,
      guestCount: guestCount || undefined,
      sleepCount: sleepCount || undefined,
      startDate: dateRange.startDate ? formatISO(dateRange.startDate) : undefined,
      endDate: dateRange.endDate ? formatISO(dateRange.endDate) : undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    };
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  }, [selectedState, selectedSuburb, category, guestCount, sleepCount, dateRange, priceRange]);

  const submit = useCallback(() => {
    if (isMobile && step < 2) {
      setStep((current) => current + 1);
      return;
    }

    const query = {
      ...(params ? qs.parse(params.toString()) : {}),
      state: selectedState?.value || undefined,
      suburb: selectedSuburb?.value || undefined,
      category: category || undefined,
      guestCount: guestCount || undefined,
      sleepCount: sleepCount || undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      startDate: dateRange.startDate ? formatISO(dateRange.startDate) : undefined,
      endDate: dateRange.endDate ? formatISO(dateRange.endDate) : undefined,
    };
    const url = qs.stringifyUrl({ url: "/", query }, { skipNull: true, skipEmptyString: true });
    saveLastSearch({
      state: selectedState?.value,
      suburb: selectedSuburb?.value,
      category: category || undefined,
      guestCount: guestCount || undefined,
      sleepCount: sleepCount || undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      startDate: dateRange.startDate ? formatISO(dateRange.startDate) : undefined,
      endDate: dateRange.endDate ? formatISO(dateRange.endDate) : undefined,
    });
    searchModal.onClose();
    router.push(url);
  }, [isMobile, step, params, selectedState, selectedSuburb, category, guestCount, sleepCount, priceRange, dateRange, searchModal, router]);

  const show = (target: number) => !isMobile || step === target;
  const stepMeta = [
    { label: "Location & vehicle", icon: IconMapPin },
    { label: "Dates", icon: IconCalendar },
    { label: "Guests & budget", icon: IconUsers },
  ];

  return (
    <Modal
      isOpen={searchModal.isOpen}
      onClose={searchModal.onClose}
      onSubmit={submit}
      title="Find your vehicle"
      actionLabel={isMobile && step < 2 ? "Continue" : "Search vehicles"}
      secondaryAction={isMobile && step > 0 ? () => setStep((current) => current - 1) : undefined}
      secondaryActionLabel={isMobile && step > 0 ? "Back" : undefined}
      mobileFullScreen
      body={<div className="mx-auto w-full max-w-2xl sm:space-y-10">
        <div className="mb-6 grid grid-cols-3 gap-2 sm:hidden" aria-label={`Search step ${step + 1} of 3`} aria-live="polite">
          {stepMeta.map((item, index) => <div key={item.label} className={`rounded-sm px-2 py-2 text-center text-[10px] font-semibold ${index === step ? "bg-primary text-white" : index < step ? "bg-surface-strong text-ink" : "bg-surface-soft text-muted"}`}><item.icon size={16} className="mx-auto mb-1" />{item.label}</div>)}
        </div>

        {show(0) && <section className="space-y-7" aria-labelledby="search-location-heading">
          <div><h3 id="search-location-heading" className="text-xl font-semibold text-ink">Where and what?</h3><p className="mt-1 text-sm text-muted">Search Australia-wide or narrow the results.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-ink">State<StateSelector value={selectedState || undefined} onChange={(state) => { setSelectedState(state); if (selectedSuburb?.state && selectedSuburb.state !== state.value) setSelectedSuburb(null); }} onClear={() => { setSelectedState(null); setSelectedSuburb(null); }} /></label>
            <label className="text-sm font-semibold text-ink">Suburb<SuburbSelector state={selectedState?.value} value={selectedSuburb || undefined} onChange={(suburb) => { setSelectedSuburb(suburb); if (!selectedState && suburb.state) { const state = AU_STATES.find((item) => item.value === suburb.state); if (state) setSelectedState(state); } }} onClear={() => setSelectedSuburb(null)} allowAllStates={!selectedState} /></label>
          </div>
          <div><p className="mb-3 text-sm font-semibold text-ink">Vehicle type</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">{VEHICLE_TYPES.map((type) => <button key={type} type="button" onClick={() => setCategory(category === type ? "" : type)} aria-pressed={category === type} className={`flex min-h-11 items-center justify-center gap-2 rounded-sm border px-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-primary ${category === type ? "border-primary bg-primary text-white" : "border-hairline bg-white text-ink hover:bg-surface-soft"}`}><IconCar size={17} />{type}</button>)}</div></div>
        </section>}

        {show(1) && <section className="space-y-5" aria-labelledby="search-dates-heading"><div><h3 id="search-dates-heading" className="text-xl font-semibold text-ink">Choose your dates</h3><p className="mt-1 text-sm text-muted">Your selections stay here if you close the search.</p></div><Calendar value={dateRange} onChange={(value) => setDateRange(value.selection)} /></section>}

        {show(2) && <section className="space-y-7" aria-labelledby="search-details-heading">
          <div><h3 id="search-details-heading" className="text-xl font-semibold text-ink">Trip details</h3><p className="mt-1 text-sm text-muted">Set capacity and a daily budget.</p></div>
          <div className="space-y-2"><Counter title="People" subtitle="How many people are coming?" value={guestCount} onChange={setGuestCount} /><Counter title="Sleep spaces" subtitle="How many sleeping spaces do you need?" value={sleepCount} onChange={setSleepCount} /></div>
          <div><p className="text-sm font-semibold text-ink">Daily price range</p><div className="mt-4 rounded-sm bg-surface-soft px-4 pb-3 pt-5"><Slider value={priceRange} onChange={(_event, value) => setPriceRange(value as number[])} valueLabelDisplay="auto" min={50} max={10000} step={50} sx={{ color: "#087985" }} /></div><div className="mt-3 flex gap-3"><TextField label="Minimum AUD" type="number" value={priceRange[0]} onChange={(event) => { const value = Number(event.target.value); if (value >= 50 && value <= priceRange[1]) setPriceRange([value, priceRange[1]]); }} inputProps={{ min: 50, max: priceRange[1], step: 50 }} size="small" fullWidth /><TextField label="Maximum AUD" type="number" value={priceRange[1]} onChange={(event) => { const value = Number(event.target.value); if (value >= priceRange[0] && value <= 10000) setPriceRange([priceRange[0], value]); }} inputProps={{ min: priceRange[0], max: 10000, step: 50 }} size="small" fullWidth /></div></div>
        </section>}
      </div>}
    />
  );
};

export default SearchModal;
