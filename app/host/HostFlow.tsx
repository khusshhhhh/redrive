"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import axios from "axios";
import { FieldValues, useForm } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CarFront,
  Gauge,
  ImagePlus,
  ListChecks,
  Loader2,
  MapPin,
  PencilLine,
  Sparkles,
  Wallet,
} from "lucide-react";
import { IconX } from "@tabler/icons-react";

import toast from "@/app/libs/toast";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";
import useLoginModal from "@/app/hooks/useLoginModal";
import { categories } from "@/app/components/navbar/Categories";
import { AMENITIES_LIST } from "@/app/hooks/useAmenities";
import CategoryInput from "@/app/components/inputs/CategoryInput";
import AddressAutocomplete, { ParsedAddress } from "@/app/components/inputs/AddressAutocomplete";
import StateSelector, { states as AU_STATES } from "@/app/components/inputs/StateSelector";
import SuburbSelector from "@/app/components/inputs/SuburbSelector";
import DatePicker from "@/app/components/inputs/DatePicker";
import Counter from "@/app/components/inputs/Counter";
import Input from "@/app/components/inputs/Input";
import TextArea from "@/app/components/inputs/TextArea";
import YearSelect from "@/app/components/inputs/YearSelect";
import VehicleMakeModelSelect from "@/app/components/inputs/VehicleMakeModelSelect";
import FuelSelector from "@/app/components/inputs/FuelSelector";
import DriveChainSelector from "@/app/components/inputs/DriveChainSelector";
import ListingPhotoManager from "@/app/components/inputs/ListingPhotoManager";
import ImageUpload from "@/app/components/inputs/ImageUpload";
import CancellationPolicySelector from "@/app/components/listings/CancellationPolicySelector";
import { CANCELLATION_POLICIES } from "@/app/libs/cancellationPolicy";
import OptionSelector from "@/app/components/inputs/OptionSelector";
import ToggleRow from "@/app/components/inputs/ToggleRow";
import ChipMultiSelect from "@/app/components/inputs/ChipMultiSelect";
import HostIllustration, { type HostPhaseKey } from "@/app/components/host/HostIllustration";
import SuccessBurst from "@/app/components/SuccessBurst";
import useUnsavedChangesWarning from "@/app/hooks/useUnsavedChangesWarning";
import { applyApiFieldErrors } from "@/app/libs/formErrors";
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
  optionLabel,
} from "@/app/libs/vehicleFacts";

type StepId =
  | "category"
  | "location"
  | "basics"
  | "vehicle"
  | "powertrain"
  | "capacity"
  | "category-specs"
  | "photos"
  | "title"
  | "description"
  | "information"
  | "amenities"
  | "safety"
  | "condition"
  | "registration"
  | "rules"
  | "delivery"
  | "price"
  | "cleaning"
  | "cancellation"
  | "review";

const PHASES: { key: HostPhaseKey; label: string; name: string; steps: StepId[] }[] = [
  { key: "about", label: "Part 1", name: "Tell us about your vehicle", steps: ["category", "location", "basics", "vehicle", "powertrain", "capacity", "category-specs"] },
  { key: "standout", label: "Part 2", name: "Make it stand out", steps: ["photos", "title", "description", "information", "amenities", "safety", "condition"] },
  { key: "finish", label: "Part 3", name: "Finish up and publish", steps: ["registration", "rules", "delivery", "price", "cleaning", "cancellation", "review"] },
];

/** A short "why guests care" note shown beside each step. Keeps hosts filling
 *  things in that actually change whether a guest books. */
const HOST_STEP_TIPS: Partial<Record<StepId, string>> = {
  category: "Guests browse by category first — it decides which searches you show up in.",
  location: "Only the suburb is public. The exact address stays hidden until a booking is confirmed.",
  basics: "Automatic vs manual is a hard filter for a lot of drivers. Seatbelt count matters to families.",
  vehicle: "The exact make, model and year lets guests check reviews and running costs before they ask.",
  powertrain: "Fuel type, drivetrain and range tell a guest whether the vehicle suits their trip.",
  capacity: "Boot space, child-seat points and vehicle height decide whether their gear and plans fit.",
  "category-specs": "Towing, payload, bed layout and water capacity are the make-or-break numbers for this category.",
  photos: "Listings with a bright, wide main photo get far more views. Aim for 5+ clear shots.",
  title: "A specific title (“Reliable ute for weekend loads”) beats a vague one every time.",
  description: "Say what it's genuinely great for and any quirks. Honesty here prevents disputes later.",
  information: "Handover and care notes set expectations so pickup and return go smoothly.",
  amenities: "Every amenity you tick is another filter you can appear in.",
  safety: "Safety ratings and driver-assist features reassure guests and the people they travel with.",
  condition: "Logging existing damage and service history protects you at return and builds trust up front.",
  registration: "Kept private — it's only used to confirm the vehicle is road-legal.",
  rules: "Clear limits (km allowance, interstate, unsealed roads, pets) prevent the disputes that hurt reviews.",
  delivery: "Delivery and airport pickup are strong booking drivers for travellers without a car.",
  price: "Set a daily rate that covers cleaning and wear. Add a deposit and discounts to attract longer trips.",
  cleaning: "A fair cleaning policy, stated up front, is better received than a surprise charge on return.",
  cancellation: "Guests see this before they request. More flexibility usually means more bookings.",
  review: "Check everything reads well. You can edit any section now or after publishing.",
};

const ALL_STEPS: StepId[] = PHASES.flatMap((phase) => phase.steps);

const phaseForStep = (id: StepId) => PHASES.find((phase) => phase.steps.includes(id))!;

export default function HostFlow() {
  const router = useRouter();
  const { currentUser, isLoading: sessionLoading } = useCurrentUser();
  const loginModal = useLoginModal();

  const [view, setView] = useState<"intro" | "flow">("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [published, setPublished] = useState(false);

  // A part-filled listing draft only lives in memory — warn before a reload or
  // tab close throws it away.
  useUnsavedChangesWarning(view === "flow" && !published && !submitting);

  const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(null);
  const [selectedSuburb, setSelectedSuburb] = useState<{ value: string; label: string } | null>(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [imageSrcs, setImageSrcs] = useState<string[]>([]);
  const [regoImage, setRegoImage] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [safetyFeatures, setSafetyFeatures] = useState<string[]>([]);
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const {
    register,
    setValue,
    setError,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      category: "",
      guestCount: 0,
      doorCount: 0,
      sleepCount: 0,
      fuelType: "",
      fuelEconomy: "",
      driveChain: "",
      year: "",
      price: 1,
      title: "",
      description: "",
      information: "",
      company: "",
      modal: "",
      regoNumber: "",
      regoEndDate: new Date().toISOString().slice(0, 10),
      cleaningFeeOption: "NO",
      cleaningFeeAmount: "",
      returnCleaningFeeAmount: "",
      cancellationPolicy: "MODERATE",

      // --- Core specs ---
      transmission: "",
      odometer: "",
      seatbeltCount: "",
      colour: "",
      keysProvided: "",
      fuelTankLitres: "",
      drivingRangeKm: "",
      vehicleHeightMeters: "",
      groundClearanceMm: "",
      hasTollTag: false,
      // --- Passengers & luggage ---
      isofixPoints: "",
      childSeatsAvailable: "",
      luggageLargeBags: "",
      luggageCabinBags: "",
      // --- EV / charging ---
      batteryCapacityKwh: "",
      chargePortType: "",
      maxChargingKw: "",
      portableChargerIncluded: false,
      // --- Condition & history ---
      damageNotes: "",
      lastServicedAt: "",
      lastServiceOdometer: "",
      tyreCondition: "",
      spareTyre: false,
      modifications: "",
      smokeFree: true,
      petFree: true,
      hasDashcam: false,
      hasGpsTracker: false,
      // --- Safety ---
      ancapRating: "",
      firstAidKit: false,
      fireExtinguisher: false,
      // --- Trip rules ---
      dailyKmAllowance: "",
      excessKmFee: "",
      interstateAllowed: true,
      interstateNotes: "",
      unsealedRoadsAllowed: false,
      offRoadAllowed: false,
      petsAllowed: false,
      smokingAllowed: false,
      festivalsAllowed: true,
      trackDaysAllowed: false,
      additionalDriversAllowed: true,
      additionalDriverFee: "",
      minimumDriverAge: "",
      minimumLicenceYears: "",
      provisionalLicenceAllowed: true,
      internationalLicenceAccepted: true,
      // --- Logistics & handover ---
      deliveryAvailable: false,
      deliveryRadiusKm: "",
      deliveryFee: "",
      airportPickup: false,
      airportPickupFee: "",
      handoverMethod: "",
      pickupInstructions: "",
      pickupWindowStart: "",
      pickupWindowEnd: "",
      // --- Costs to expect ---
      securityDeposit: "",
      depositHoldMethod: "",
      weeklyDiscountPercent: "",
      monthlyDiscountPercent: "",
      lateReturnFeePerHour: "",
      refuellingFeePerLitre: "",
      tollHandling: "",
      finesAdminFee: "",
      roadsideAssistanceIncluded: false,
      roadsideAssistanceProvider: "",
      // --- Utes ---
      payloadKg: "",
      gvmKg: "",
      towingCapacityBrakedKg: "",
      towingCapacityUnbrakedKg: "",
      towBarFitted: false,
      trayLengthMm: "",
      trayWidthMm: "",
      canopyFitted: false,
      // --- Vans ---
      loadVolumeCubicMetres: "",
      loadLengthMm: "",
      internalHeightMm: "",
      plyLined: false,
      // --- Campervans / caravans / motorhomes ---
      sleepingConfiguration: "",
      bedDimensions: "",
      selfContained: false,
      selfContainedCertNumber: "",
      freshWaterLitres: "",
      greyWaterLitres: "",
      gasBottleKg: "",
      solarWatts: "",
      houseBatteryAmpHours: "",
      awningFitted: false,
      showerType: "",
      toiletType: "",
      requiresSpecialLicence: false,
      towVehicleRequirements: "",
    },
  });

  const setCustom = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (id: string, value: any) => setValue(id, value, { shouldValidate: true, shouldDirty: true, shouldTouch: true }),
    [setValue],
  );

  const category = watch("category");
  const guestCount = watch("guestCount");
  const doorCount = watch("doorCount");
  const sleepCount = watch("sleepCount");
  const regoEndDate = watch("regoEndDate");
  const cleaningFeeOption = watch("cleaningFeeOption");
  const cancellationPolicy = watch("cancellationPolicy");
  const fuelType = watch("fuelType");

  // The "category-specs" step only applies to utes, vans and campers.
  const stepOrder = useMemo(
    () => ALL_STEPS.filter((step) => step !== "category-specs" || categorySpecGroup(category) !== null),
    [category],
  );

  const Map = useMemo(
    () => dynamic(() => import("@/app/components/Map"), { ssr: false }),
    [],
  );

  const onAddressSelect = useCallback((result: ParsedAddress) => {
    if (result.state) {
      const known = AU_STATES.find(
        (s) => s.value === result.state || s.label.toLowerCase() === result.state?.toLowerCase(),
      );
      setSelectedState(known || { value: result.state, label: result.state });
    }
    if (result.suburb) {
      setSelectedSuburb({
        value: result.suburb,
        label: result.postcode ? `${result.suburb}, ${result.postcode}` : result.suburb,
      });
    }
    if (typeof result.lat === "number" && typeof result.lng === "number") {
      setCoords({ lat: result.lat, lng: result.lng });
    }
  }, []);

  const onAddressManualChange = useCallback((value: string) => {
    setAddress(value);
    // A hand-edited address no longer matches the geocoded pin.
    setCoords(null);
  }, []);

  const toggleAmenity = (id: string) =>
    setSelectedAmenities((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const toggleFrom = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const clampedStepIndex = Math.min(stepIndex, stepOrder.length - 1);
  const currentStep = stepOrder[clampedStepIndex];
  const totalSteps = stepOrder.length;
  const progress = view === "intro" ? 0 : Math.round(((clampedStepIndex + 1) / totalSteps) * 100);

  // The page itself doesn't scroll; reset the inner form region on every step.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [currentStep]);

  const validateStep = useCallback(
    async (id: StepId): Promise<string | null> => {
      const values = getValues();
      switch (id) {
        case "category":
          return values.category ? null : "Choose the category that fits your vehicle.";
        case "basics":
          return values.transmission ? null : "Select the transmission.";
        case "location":
          if (!address.trim()) return "Add the street address so we can place your vehicle.";
          if (!selectedSuburb?.value) return "Select the suburb.";
          if (!selectedState?.value) return "Select the state.";
          return null;
        case "vehicle": {
          if (!values.company?.trim()) return "Add the vehicle make.";
          if (!values.modal?.trim()) return "Add the vehicle model.";
          const ok = await trigger("year");
          return ok && values.year ? null : "Add the manufacturing year.";
        }
        case "powertrain":
          if (!values.fuelType) return "Select the fuel type.";
          if (!values.driveChain) return "Select the drive chain.";
          return null;
        case "photos":
          if (uploadingPhotos) return "Wait for the photos to finish uploading.";
          return imageSrcs.length >= 1 ? null : "Add at least one main photo.";
        case "title": {
          const ok = await trigger("title");
          return ok ? null : "Give your listing a title.";
        }
        case "description": {
          const ok = await trigger("description");
          return ok ? null : "Add a short description.";
        }
        case "information": {
          const ok = await trigger("information");
          return ok ? null : "Add the handover and care notes guests need.";
        }
        case "registration": {
          const ok = await trigger("regoNumber");
          return ok ? null : "Add the registration number.";
        }
        case "price": {
          const raw = Number(values.price);
          return raw > 0 ? null : "Set a daily price above zero.";
        }
        case "cleaning":
          if (cleaningFeeOption === "YES" && !values.cleaningFeeAmount) return "Add the cleaning fee amount.";
          if (cleaningFeeOption === "UPON_RETURNING" && !values.returnCleaningFeeAmount) return "Add the amount charged on return.";
          return null;
        default:
          return null;
      }
    },
    [address, cleaningFeeOption, getValues, imageSrcs.length, selectedState, selectedSuburb, trigger, uploadingPhotos],
  );

  const goToStep = (id: StepId) => {
    const index = stepOrder.indexOf(id);
    if (index >= 0) {
      setStepIndex(index);
      setView("flow");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const publish = useCallback(async () => {
    setSubmitting(true);
    const data = getValues();
    const payload = {
      ...data,
      imageSrcs,
      regoImage,
      amenities: selectedAmenities,
      damagePhotos,
      safetyFeatures,
      languagesSpoken,
      state: selectedState?.value,
      suburb: selectedSuburb?.value,
      address: address.trim() !== "" ? address : "Unknown",
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      cleaningFeeOption: data.cleaningFeeOption,
      cleaningFeeAmount: data.cleaningFeeAmount || null,
      returnCleaningFeeAmount: data.returnCleaningFeeAmount || null,
    };

    try {
      await axios.post("/api/listings", payload, { headers: { "Content-Type": "application/json" } });
      setPublished(true);
    } catch (error) {
      const mapped = applyApiFieldErrors(error, setError);
      const message = axios.isAxiosError(error) ? error.response?.data?.error : null;
      toast.error(
        mapped
          ? "Some details need fixing — step back through the form to see which."
          : message || "Something went wrong while publishing. Please try again.",
      );
      setSubmitting(false);
    }
  }, [address, coords, damagePhotos, getValues, imageSrcs, languagesSpoken, regoImage, safetyFeatures, selectedAmenities, selectedState, selectedSuburb, setError]);

  const next = useCallback(async () => {
    const error = await validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }
    if (clampedStepIndex >= totalSteps - 1) {
      void publish();
      return;
    }
    setStepIndex(clampedStepIndex + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, clampedStepIndex, publish, totalSteps, validateStep]);

  const back = useCallback(() => {
    if (clampedStepIndex === 0) {
      setView("intro");
      return;
    }
    setStepIndex(clampedStepIndex - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clampedStepIndex]);

  /* ---- gates ------------------------------------------------------------- */

  if (sessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={30} aria-label="Loading" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-strong text-primary">
          <CarFront size={30} />
        </span>
        <h1 className="mt-6 text-display-2xl font-extrabold tracking-tight text-ink">Sign in to start hosting</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          You need a Redrive account to list a vehicle. It takes a minute and your progress is saved as you go.
        </p>
        <button
          type="button"
          onClick={() => loginModal.onOpen("/host")}
          className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-white transition hover:bg-primary-active"
        >
          Sign in to continue <ArrowRight size={17} />
        </button>
      </div>
    );
  }

  if (published) {
    return (
      <SuccessBurst
        title="Your listing is live"
        subtitle="Taking you to your listings so you can set availability…"
        onDone={() => {
          router.push("/properties");
          router.refresh();
        }}
      />
    );
  }

  /* ---- intro ----------------------------------------------------------- */

  if (view === "intro") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="host-step">
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              <Sparkles size={13} /> Redrive hosting
            </span>
            <h1 className="mt-6 text-display-hero font-extrabold tracking-tight text-ink">
              It&rsquo;s easy to list your&nbsp;vehicle
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              Answer a few questions, add some photos and set your price. You can pause any time &mdash; nothing goes
              live until you publish.
            </p>
            <div className="mt-8 max-w-sm">
              <HostIllustration frame={1} />
            </div>
            <button
              type="button"
              onClick={() => {
                setView("flow");
                setStepIndex(0);
              }}
              className="group mt-8 inline-flex h-14 items-center gap-2.5 rounded-full bg-primary px-8 text-base font-semibold text-white transition hover:bg-primary-active"
            >
              Get started
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <ol className="host-step space-y-3" style={{ animationDelay: "90ms" }}>
            {[
              { n: 1, name: "Tell us about your vehicle", copy: "Category, location, transmission and the specs guests filter by.", icon: CarFront },
              { n: 2, name: "Make it stand out", copy: "Photos, description, amenities, safety and condition.", icon: Camera },
              { n: 3, name: "Finish up and publish", copy: "Trip rules, delivery, price, deposit and cancellation.", icon: BadgeCheck },
            ].map((row) => (
              <li
                key={row.n}
                className="flex items-start gap-4 rounded-2xl border border-hairline-soft bg-white p-5 shadow-[0_10px_30px_-18px_rgba(59,59,59,0.35)] transition hover:-translate-y-0.5 hover:border-border-strong"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
                  <row.icon size={20} />
                </span>
                <div>
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted-soft">Part {row.n}</p>
                  <p className="mt-1 text-base font-semibold text-ink">{row.name}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{row.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        </div>
      </div>
    );
  }

  /* ---- flow ---------------------------------------------------------------- */

  const phase = phaseForStep(currentStep);
  const isLast = clampedStepIndex >= totalSteps - 1;
  // Walk the five illustration frames across the whole flow as a journey.
  const illustrationFrame = Math.min(
    5,
    Math.max(1, Math.ceil(((clampedStepIndex + 1) / totalSteps) * 5)),
  ) as 1 | 2 | 3 | 4 | 5;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* progress */}
      <div className="shrink-0 border-b border-hairline-soft bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-soft">
            {phase.label} &middot; {phase.name}
          </p>
          <p className="text-[11px] font-semibold text-muted">
            {clampedStepIndex + 1} / {totalSteps}
          </p>
        </div>
        <div className="h-1 w-full bg-surface-strong">
          <div className="host-progress-fill h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* body: idle illustration + the single scrollable region */}
      <div className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col justify-center border-r border-hairline-soft px-8 py-8 lg:flex">
          <HostIllustration frame={illustrationFrame} />
          <div className="host-illustration-road mt-6 h-0.5 w-full opacity-70" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">{phase.name}</p>
          {HOST_STEP_TIPS[currentStep] && (
            <p key={currentStep} className="host-step mt-2 text-sm leading-6 text-muted">
              {HOST_STEP_TIPS[currentStep]}
            </p>
          )}
        </aside>

        <div ref={scrollRef} className="min-h-0 overflow-y-auto px-5 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto max-w-xl">
            {HOST_STEP_TIPS[currentStep] && (
              <p className="mb-6 rounded-xl bg-surface-soft px-4 py-3 text-sm leading-6 text-muted lg:hidden">
                <span className="font-semibold text-ink">Why it matters — </span>
                {HOST_STEP_TIPS[currentStep]}
              </p>
            )}
            <div key={currentStep} className="host-step">
              <StepBody
            step={currentStep}
            register={register}
            errors={errors}
            setValue={setValue}
            setCustom={setCustom}
            watch={watch}
            getValues={getValues}
            category={category}
            guestCount={guestCount}
            doorCount={doorCount}
            sleepCount={sleepCount}
            regoEndDate={regoEndDate}
            cleaningFeeOption={cleaningFeeOption}
            cancellationPolicy={cancellationPolicy}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            selectedSuburb={selectedSuburb}
            setSelectedSuburb={setSelectedSuburb}
            setAddress={onAddressManualChange}
            onAddressSelect={onAddressSelect}
            coords={coords}
            MapComponent={Map}
            imageSrcs={imageSrcs}
            setImageSrcs={setImageSrcs}
            setUploadingPhotos={setUploadingPhotos}
            regoImage={regoImage}
            setRegoImage={setRegoImage}
            selectedAmenities={selectedAmenities}
            toggleAmenity={toggleAmenity}
            fuelType={fuelType}
            damagePhotos={damagePhotos}
            setDamagePhotos={setDamagePhotos}
            safetyFeatures={safetyFeatures}
            toggleSafetyFeature={toggleFrom(setSafetyFeatures)}
            languagesSpoken={languagesSpoken}
            toggleLanguage={toggleFrom(setLanguagesSpoken)}
            address={address}
            goToStep={goToStep}
            submitting={submitting}
              />
            </div>
          </div>
        </div>
      </div>

      {/* action bar — pinned to the bottom of the fixed-height flow */}
      <div className="shrink-0 border-t border-hairline bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={back}
            disabled={submitting}
            className="text-sm font-semibold text-ink underline-offset-4 transition hover:underline disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeft size={16} /> Back
            </span>
          </button>
          <button
            type="button"
            onClick={() => void next()}
            disabled={submitting}
            className="inline-flex h-12 min-w-[140px] items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-white transition hover:bg-primary-active disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={17} className="animate-spin" /> Publishing…
              </>
            ) : isLast ? (
              <>
                Publish listing <Sparkles size={16} />
              </>
            ) : (
              <>
                Next <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================== */

interface StepBodyProps {
  step: StepId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setCustom: (id: string, value: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValues: () => any;
  category: string;
  guestCount: number;
  doorCount: number;
  sleepCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  regoEndDate: any;
  cleaningFeeOption: string;
  cancellationPolicy: string;
  selectedState: { value: string; label: string } | null;
  setSelectedState: (v: { value: string; label: string } | null) => void;
  selectedSuburb: { value: string; label: string } | null;
  setSelectedSuburb: (v: { value: string; label: string } | null) => void;
  setAddress: (v: string) => void;
  onAddressSelect: (r: ParsedAddress) => void;
  coords: { lat: number; lng: number } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MapComponent: any;
  imageSrcs: string[];
  setImageSrcs: (v: string[]) => void;
  setUploadingPhotos: (v: boolean) => void;
  regoImage: string;
  setRegoImage: (v: string) => void;
  selectedAmenities: string[];
  toggleAmenity: (id: string) => void;
  fuelType: string;
  damagePhotos: string[];
  setDamagePhotos: (v: string[]) => void;
  safetyFeatures: string[];
  toggleSafetyFeature: (id: string) => void;
  languagesSpoken: string[];
  toggleLanguage: (id: string) => void;
  address: string;
  goToStep: (id: StepId) => void;
  submitting: boolean;
}

/** Compact optional number field bound to the RHF form (default value is ""). */
function NumberField({
  id,
  label,
  register,
  errors,
  placeholder,
}: {
  id: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  placeholder?: string;
}) {
  return <Input id={id} label={label} type="number" register={register} errors={errors} placeholder={placeholder} />;
}

/** A titled group wrapper inside a step. */
function FieldGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      {title && <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-soft">{title}</p>}
      {children}
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-display-2xl font-extrabold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-3 text-[15px] leading-7 text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

interface LocationStepProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  selectedState: { value: string; label: string } | null;
  setSelectedState: (v: { value: string; label: string } | null) => void;
  selectedSuburb: { value: string; label: string } | null;
  setSelectedSuburb: (v: { value: string; label: string } | null) => void;
  setAddress: (v: string) => void;
  onAddressSelect: (r: ParsedAddress) => void;
  coords: { lat: number; lng: number } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MapComponent: any;
}

function LocationStep({
  register,
  setValue,
  errors,
  selectedState,
  setSelectedState,
  selectedSuburb,
  setSelectedSuburb,
  setAddress,
  onAddressSelect,
  coords,
  MapComponent,
}: LocationStepProps) {
  const areaResolved = Boolean(selectedSuburb?.value && selectedState?.value);
  const [editingArea, setEditingArea] = useState(false);

  return (
    <StepShell
      title="Where is your vehicle kept?"
      subtitle="Guests only ever see the suburb — the exact address stays private until a booking is confirmed."
    >
      <div className="flex flex-col gap-6">
        <AddressAutocomplete
          id="address"
          label="Number & street address"
          register={register}
          setValue={setValue}
          errors={errors}
          required
          validate={(value) => value.trim() !== "" || "Address is required"}
          onManualChange={setAddress}
          onSelect={onAddressSelect}
        />

        {areaResolved && !editingArea ? (
          <div className="flex items-start justify-between gap-4 rounded-sm border border-hairline bg-surface-soft px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-soft">Suburb &amp; state</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                {selectedSuburb?.label} · {selectedState?.label}
              </p>
              <p className="mt-0.5 text-xs text-muted">Pulled from the address above. Change it if it&rsquo;s not right.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingArea(true)}
              className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Suburb</label>
              <SuburbSelector
                portalMenu={false}
                state={selectedState?.value}
                value={selectedSuburb ?? undefined}
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
              <StateSelector
                portalMenu={false}
                value={selectedState ?? undefined}
                onChange={setSelectedState}
              />
            </div>
            {areaResolved && (
              <button
                type="button"
                onClick={() => setEditingArea(false)}
                className="self-start text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                Done
              </button>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-md border border-hairline-soft">
          <MapComponent
            suburb={selectedSuburb?.value}
            state={selectedState?.value}
            latitude={coords?.lat}
            longitude={coords?.lng}
          />
        </div>
      </div>
    </StepShell>
  );
}

function StepBody(props: StepBodyProps) {
  const {
    step,
    register,
    errors,
    setValue,
    setCustom,
    watch,
    getValues,
    category,
    guestCount,
    doorCount,
    sleepCount,
    regoEndDate,
    cleaningFeeOption,
    cancellationPolicy,
    selectedState,
    setSelectedState,
    selectedSuburb,
    setSelectedSuburb,
    setAddress,
    onAddressSelect,
    coords,
    MapComponent,
    imageSrcs,
    setImageSrcs,
    setUploadingPhotos,
    regoImage,
    setRegoImage,
    selectedAmenities,
    toggleAmenity,
    fuelType,
    damagePhotos,
    setDamagePhotos,
    safetyFeatures,
    toggleSafetyFeature,
    languagesSpoken,
    toggleLanguage,
    address,
    goToStep,
    submitting,
  } = props;

  const isElectrified = fuelType === "EV" || fuelType === "Hybrid";
  const specGroup = categorySpecGroup(category);

  switch (step) {
    case "category":
      return (
        <StepShell title="Which best describes your vehicle?" subtitle="This sets the category guests browse and filter by.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {categories.map((item) => (
              <CategoryInput
                key={item.label}
                onClick={(value) => setCustom("category", value)}
                selected={category === item.label}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </div>
        </StepShell>
      );

    case "location":
      return (
        <LocationStep
          register={register}
          setValue={setValue}
          errors={errors}
          selectedState={selectedState}
          setSelectedState={setSelectedState}
          selectedSuburb={selectedSuburb}
          setSelectedSuburb={setSelectedSuburb}
          setAddress={setAddress}
          onAddressSelect={onAddressSelect}
          coords={coords}
          MapComponent={MapComponent}
        />
      );

    case "basics":
      return (
        <StepShell title="Share a few basics" subtitle="Set the counters to zero if they don't apply to your vehicle.">
          <div className="flex flex-col divide-y divide-hairline-soft">
            <div className="pb-6">
              <Counter title="People" subtitle="How many passengers can travel?" value={guestCount} onChange={(v) => setCustom("guestCount", v)} />
            </div>
            <div className="py-6">
              <Counter title="Doors" subtitle="How many doors does it have?" value={doorCount} onChange={(v) => setCustom("doorCount", v)} />
            </div>
            <div className="pt-6">
              <Counter title="Sleeping space" subtitle="How many people can sleep in it?" value={sleepCount} onChange={(v) => setCustom("sleepCount", v)} />
            </div>
          </div>
          <FieldGroup title="Transmission">
            <OptionSelector options={TRANSMISSION_OPTIONS} value={watch("transmission")} onChange={(v) => setCustom("transmission", v)} disabled={submitting} />
          </FieldGroup>
          <div className="grid gap-6 sm:grid-cols-2">
            <NumberField id="odometer" label="Odometer (km)" register={register} errors={errors} placeholder="e.g. 85000" />
            <NumberField id="seatbeltCount" label="Seatbelts" register={register} errors={errors} placeholder="e.g. 5" />
            <Input id="colour" label="Colour" register={register} errors={errors} placeholder="e.g. Silver" />
            <NumberField id="keysProvided" label="Sets of keys provided" register={register} errors={errors} placeholder="e.g. 2" />
          </div>
        </StepShell>
      );

    case "vehicle": {
      const usePicker = category === "Car" || category === "Utes";
      return (
        <StepShell title="What is it, exactly?" subtitle="The make, model and year guests see on your listing.">
          {usePicker ? (
            <VehicleMakeModelSelect
              make={watch("company") || ""}
              model={watch("modal") || ""}
              onChange={(make, model) => {
                setCustom("company", make);
                setCustom("modal", model);
              }}
              disabled={submitting}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <Input id="company" label="Make" placeholder="e.g. Ford" register={register} errors={errors} required />
              <Input id="modal" label="Model" placeholder="e.g. Ranger Raptor" register={register} errors={errors} required />
            </div>
          )}
          <YearSelect id="year" label="Manufacturing year" setValue={setValue} watch={watch} register={register} errors={errors} required />
        </StepShell>
      );
    }

    case "powertrain":
      return (
        <StepShell title="How does it drive?" subtitle="Guests filter on fuel type and drivetrain when they plan trips.">
          <FuelSelector id="fuelType" label="Fuel type" watch={watch} setValue={setValue} errors={errors} required />
          <DriveChainSelector id="driveChain" label="Drive chain" watch={watch} setValue={setValue} errors={errors} required />
          <div className="grid gap-6 sm:grid-cols-2">
            <Input id="fuelEconomy" label="Fuel economy (L/100km) — optional" type="number" register={register} errors={errors} required={false} />
            <NumberField id="fuelTankLitres" label={isElectrified ? "Usable range (km)" : "Fuel tank (L)"} register={register} errors={errors} />
            {!isElectrified && <NumberField id="drivingRangeKm" label="Typical driving range (km) — optional" register={register} errors={errors} />}
          </div>
          {isElectrified && (
            <FieldGroup title="Charging">
              <div className="grid gap-6 sm:grid-cols-2">
                <NumberField id="batteryCapacityKwh" label="Battery capacity (kWh)" register={register} errors={errors} />
                <NumberField id="drivingRangeKm" label="Real-world range (km)" register={register} errors={errors} />
                <NumberField id="maxChargingKw" label="Max DC charge rate (kW)" register={register} errors={errors} />
              </div>
              <OptionSelector label="Charge port" options={CHARGE_PORT_OPTIONS} value={watch("chargePortType")} onChange={(v) => setCustom("chargePortType", v)} allowDeselect />
              <ToggleRow title="Portable charger included" subtitle="A granny/travel charger travels with the vehicle" value={!!watch("portableChargerIncluded")} onChange={(v) => setCustom("portableChargerIncluded", v)} />
            </FieldGroup>
          )}
        </StepShell>
      );

    case "capacity":
      return (
        <StepShell title="Space and access" subtitle="Every field here is optional — fill in what you know.">
          <FieldGroup title="Passengers & luggage">
            <div className="grid gap-6 sm:grid-cols-2">
              <NumberField id="isofixPoints" label="ISOFIX child-seat points" register={register} errors={errors} />
              <NumberField id="childSeatsAvailable" label="Child seats you can provide" register={register} errors={errors} />
              <NumberField id="luggageLargeBags" label="Large suitcases it fits" register={register} errors={errors} />
              <NumberField id="luggageCabinBags" label="Cabin bags it fits" register={register} errors={errors} />
            </div>
          </FieldGroup>
          <FieldGroup title="Dimensions">
            <div className="grid gap-6 sm:grid-cols-2">
              <NumberField id="vehicleHeightMeters" label="Vehicle height (m)" register={register} errors={errors} placeholder="e.g. 1.9" />
              <NumberField id="groundClearanceMm" label="Ground clearance (mm)" register={register} errors={errors} />
            </div>
          </FieldGroup>
          <ToggleRow title="E-tag / toll tag fitted" subtitle="An electronic toll tag is in the vehicle" value={!!watch("hasTollTag")} onChange={(v) => setCustom("hasTollTag", v)} />
        </StepShell>
      );

    case "category-specs": {
      if (specGroup === "UTE") {
        return (
          <StepShell title="Ute & towing specs" subtitle="What can this ute carry and tow? All optional.">
            <div className="grid gap-6 sm:grid-cols-2">
              <NumberField id="payloadKg" label="Payload (kg)" register={register} errors={errors} />
              <NumberField id="gvmKg" label="GVM (kg)" register={register} errors={errors} />
              <NumberField id="towingCapacityBrakedKg" label="Towing — braked (kg)" register={register} errors={errors} />
              <NumberField id="towingCapacityUnbrakedKg" label="Towing — unbraked (kg)" register={register} errors={errors} />
              <NumberField id="trayLengthMm" label="Tray length (mm)" register={register} errors={errors} />
              <NumberField id="trayWidthMm" label="Tray width (mm)" register={register} errors={errors} />
            </div>
            <ToggleRow title="Tow bar fitted" value={!!watch("towBarFitted")} onChange={(v) => setCustom("towBarFitted", v)} />
            <ToggleRow title="Canopy fitted" value={!!watch("canopyFitted")} onChange={(v) => setCustom("canopyFitted", v)} />
          </StepShell>
        );
      }
      if (specGroup === "VAN") {
        return (
          <StepShell title="Cargo specs" subtitle="Help tradies and movers judge fit. All optional.">
            <div className="grid gap-6 sm:grid-cols-2">
              <NumberField id="loadVolumeCubicMetres" label="Load volume (m³)" register={register} errors={errors} placeholder="e.g. 6.2" />
              <NumberField id="loadLengthMm" label="Load length (mm)" register={register} errors={errors} />
              <NumberField id="internalHeightMm" label="Internal height (mm)" register={register} errors={errors} />
            </div>
            <ToggleRow title="Ply-lined" subtitle="Walls and floor are lined to protect cargo" value={!!watch("plyLined")} onChange={(v) => setCustom("plyLined", v)} />
          </StepShell>
        );
      }
      return (
        <StepShell title="Camp & touring setup" subtitle="The details caravan and motorhome guests care about. All optional.">
          <Input id="sleepingConfiguration" label="Sleeping configuration" register={register} errors={errors} placeholder="e.g. 1 queen + convertible dinette" />
          <Input id="bedDimensions" label="Main bed dimensions" register={register} errors={errors} placeholder="e.g. 1900 x 1500 mm" />
          <FieldGroup title="Self-contained">
            <ToggleRow title="Self-contained certified" value={!!watch("selfContained")} onChange={(v) => setCustom("selfContained", v)} />
            {watch("selfContained") && <Input id="selfContainedCertNumber" label="Certification number" register={register} errors={errors} />}
          </FieldGroup>
          <FieldGroup title="Water, gas & power">
            <div className="grid gap-6 sm:grid-cols-2">
              <NumberField id="freshWaterLitres" label="Fresh water (L)" register={register} errors={errors} />
              <NumberField id="greyWaterLitres" label="Grey water (L)" register={register} errors={errors} />
              <NumberField id="gasBottleKg" label="Gas bottle (kg)" register={register} errors={errors} />
              <NumberField id="solarWatts" label="Solar (W)" register={register} errors={errors} />
              <NumberField id="houseBatteryAmpHours" label="House battery (Ah)" register={register} errors={errors} />
            </div>
          </FieldGroup>
          <OptionSelector label="Shower" options={SHOWER_TYPE_OPTIONS} value={watch("showerType")} onChange={(v) => setCustom("showerType", v)} columns={3} allowDeselect />
          <OptionSelector label="Toilet" options={TOILET_TYPE_OPTIONS} value={watch("toiletType")} onChange={(v) => setCustom("toiletType", v)} allowDeselect />
          <ToggleRow title="Awning fitted" value={!!watch("awningFitted")} onChange={(v) => setCustom("awningFitted", v)} />
          <FieldGroup title="Licence & tow vehicle">
            <ToggleRow title="Requires a special licence to drive" value={!!watch("requiresSpecialLicence")} onChange={(v) => setCustom("requiresSpecialLicence", v)} />
            <Input id="towVehicleRequirements" label="Tow vehicle requirements — optional" register={register} errors={errors} placeholder="e.g. 3.5t braked towing capacity, WDH recommended" />
          </FieldGroup>
        </StepShell>
      );
    }

    case "photos":
      return (
        <StepShell title="Add your photos" subtitle="Start with one strong main photo, then add up to nine more. Bright, wide shots book best.">
          <ListingPhotoManager images={imageSrcs} onChange={setImageSrcs} disabled={submitting} onUploadingChange={setUploadingPhotos} />
        </StepShell>
      );

    case "title":
      return (
        <StepShell title="Give your listing a title" subtitle="Short, specific and honest. You can change it any time.">
          <Input id="title" label="Listing title" placeholder="e.g. Powerful ute for weekend projects — Adelaide" register={register} errors={errors} required />
        </StepShell>
      );

    case "description":
      return (
        <StepShell title="Describe your vehicle" subtitle="What makes it useful, comfortable or a bit special?">
          <TextArea id="description" label="Description" placeholder="Tell guests what it's great for and what to expect." register={register} errors={errors} required />
        </StepShell>
      );

    case "information":
      return (
        <StepShell title="Anything guests should know?" subtitle="Handover instructions, care requirements, house rules — the practical details.">
          <TextArea id="information" label="Handover & care notes" placeholder="e.g. Pick-up from the driveway, premium fuel only, no smoking, return with a full tank." register={register} errors={errors} required />
        </StepShell>
      );

    case "amenities":
      return (
        <StepShell title="What does it come with?" subtitle="Pick everything that applies. This is optional, but listings with amenities get more views.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AMENITIES_LIST.map((amenity) => {
              const Icon = amenity.icon;
              const active = selectedAmenities.includes(amenity.id);
              return (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenity(amenity.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-md border p-4 text-left text-sm font-medium transition ${
                    active ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-ink"
                  }`}
                >
                  <Icon size={22} stroke={1.8} />
                  {amenity.name}
                </button>
              );
            })}
          </div>
        </StepShell>
      );

    case "safety":
      return (
        <StepShell title="Safety" subtitle="Optional, but safety details reassure guests and their families.">
          <FieldGroup title="ANCAP rating">
            <OptionSelector
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}★` }))}
              value={watch("ancapRating") ? String(watch("ancapRating")) : ""}
              onChange={(v) => setCustom("ancapRating", v)}
              columns={3}
              allowDeselect
            />
          </FieldGroup>
          <FieldGroup title="Driver-assist & safety features">
            <ChipMultiSelect items={SAFETY_FEATURES_LIST} selected={safetyFeatures} onToggle={toggleSafetyFeature} disabled={submitting} />
          </FieldGroup>
          <ToggleRow title="First-aid kit on board" value={!!watch("firstAidKit")} onChange={(v) => setCustom("firstAidKit", v)} />
          <ToggleRow title="Fire extinguisher on board" value={!!watch("fireExtinguisher")} onChange={(v) => setCustom("fireExtinguisher", v)} />
        </StepShell>
      );

    case "condition":
      return (
        <StepShell title="Condition & history" subtitle="Being upfront here protects you at return and builds trust before the booking.">
          <TextArea id="damageNotes" label="Existing damage & cosmetic quirks — optional" placeholder="e.g. Small scratch on the rear bumper, stone chip on the windscreen (not in driver's view)." register={register} errors={errors} />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Photos of existing damage — optional</label>
            <ListingPhotoManager images={damagePhotos} onChange={setDamagePhotos} disabled={submitting} />
          </div>
          <FieldGroup title="Servicing">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Last serviced — optional</label>
              <DatePicker
                value={watch("lastServicedAt") || ""}
                onChange={(value) => setCustom("lastServicedAt", value)}
                maxDate={new Date()}
                placeholder="Select the last service date"
                ariaLabel="Last service date"
              />
            </div>
            <NumberField id="lastServiceOdometer" label="Odometer at last service (km) — optional" register={register} errors={errors} />
          </FieldGroup>
          <OptionSelector label="Tyre condition" options={TYRE_CONDITION_OPTIONS} value={watch("tyreCondition")} onChange={(v) => setCustom("tyreCondition", v)} columns={3} allowDeselect />
          <ToggleRow title="Spare tyre & tools on board" value={!!watch("spareTyre")} onChange={(v) => setCustom("spareTyre", v)} />
          <Input id="modifications" label="Modifications — optional" register={register} errors={errors} placeholder="e.g. Lift kit, bull bar, dual battery system" />
          <FieldGroup title="Care & disclosure">
            <ToggleRow title="Smoke-free vehicle" value={!!watch("smokeFree")} onChange={(v) => setCustom("smokeFree", v)} />
            <ToggleRow title="Pet-free vehicle" value={!!watch("petFree")} onChange={(v) => setCustom("petFree", v)} />
            <ToggleRow title="Dashcam fitted" subtitle="Guests are told a dashcam may record" value={!!watch("hasDashcam")} onChange={(v) => setCustom("hasDashcam", v)} />
            <ToggleRow title="GPS tracker fitted" subtitle="Guests are told the vehicle has a tracker" value={!!watch("hasGpsTracker")} onChange={(v) => setCustom("hasGpsTracker", v)} />
          </FieldGroup>
        </StepShell>
      );

    case "registration":
      return (
        <StepShell title="Registration details" subtitle="We use this to confirm the vehicle is road-legal. It is never shown publicly.">
          <Input
            id="regoNumber"
            label="Registration number"
            placeholder="ABC123DEF"
            maxLength={9}
            register={register}
            errors={errors}
            required
            onChange={(e) => setCustom("regoNumber", e.target.value.toUpperCase())}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Registration expiry date</label>
            <DatePicker
              value={typeof regoEndDate === "string" ? regoEndDate : ""}
              onChange={(value) => setCustom("regoEndDate", value)}
              minDate={new Date()}
              placeholder="Select the expiry date"
              ariaLabel="Registration expiry date"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Registration document — optional</label>
            {regoImage ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-hairline-soft">
                <Image alt="Registration document preview" src={regoImage} fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setRegoImage("")}
                  className="absolute right-2 top-2 rounded-full bg-error p-1 text-white transition hover:opacity-80"
                  aria-label="Remove registration document"
                >
                  <IconX size={18} />
                </button>
              </div>
            ) : (
              <ImageUpload folder="registrations" value={regoImage} onChange={setRegoImage} previewAlt="Registration document preview" />
            )}
          </div>
        </StepShell>
      );

    case "rules":
      return (
        <StepShell title="Trip rules" subtitle="Set clear expectations up front. Guests see these before they request.">
          <FieldGroup title="Distance">
            <ToggleRow
              title="Unlimited kilometres"
              subtitle="Turn off to set a daily allowance and excess fee"
              value={watch("dailyKmAllowance") === "" || watch("dailyKmAllowance") === null}
              onChange={(unlimited) => setCustom("dailyKmAllowance", unlimited ? "" : 200)}
            />
            {watch("dailyKmAllowance") !== "" && watch("dailyKmAllowance") !== null && (
              <div className="grid gap-6 sm:grid-cols-2">
                <NumberField id="dailyKmAllowance" label="Daily km allowance" register={register} errors={errors} />
                <NumberField id="excessKmFee" label="Excess km fee (AUD/km)" register={register} errors={errors} placeholder="e.g. 0.33" />
              </div>
            )}
          </FieldGroup>
          <FieldGroup title="Where it can go">
            <ToggleRow title="Interstate travel allowed" value={!!watch("interstateAllowed")} onChange={(v) => setCustom("interstateAllowed", v)} />
            {watch("interstateAllowed") && <Input id="interstateNotes" label="Interstate notes — optional" register={register} errors={errors} placeholder="e.g. NSW and VIC only, let me know before you cross a border" />}
            <ToggleRow title="Unsealed / gravel roads allowed" value={!!watch("unsealedRoadsAllowed")} onChange={(v) => setCustom("unsealedRoadsAllowed", v)} />
            <ToggleRow title="Off-road / 4WD tracks allowed" value={!!watch("offRoadAllowed")} onChange={(v) => setCustom("offRoadAllowed", v)} />
            <ToggleRow title="Festivals & events allowed" value={!!watch("festivalsAllowed")} onChange={(v) => setCustom("festivalsAllowed", v)} />
            <ToggleRow title="Track days allowed" value={!!watch("trackDaysAllowed")} onChange={(v) => setCustom("trackDaysAllowed", v)} />
          </FieldGroup>
          <FieldGroup title="Who can drive">
            <ToggleRow title="Additional drivers allowed" value={!!watch("additionalDriversAllowed")} onChange={(v) => setCustom("additionalDriversAllowed", v)} />
            {watch("additionalDriversAllowed") && <NumberField id="additionalDriverFee" label="Additional driver fee (AUD) — optional" register={register} errors={errors} />}
            <div className="grid gap-6 sm:grid-cols-2">
              <NumberField id="minimumDriverAge" label="Minimum driver age" register={register} errors={errors} placeholder="e.g. 21" />
              <NumberField id="minimumLicenceYears" label="Min. years licensed" register={register} errors={errors} placeholder="e.g. 2" />
            </div>
            <ToggleRow title="Provisional (P-plate) drivers allowed" value={!!watch("provisionalLicenceAllowed")} onChange={(v) => setCustom("provisionalLicenceAllowed", v)} />
            <ToggleRow title="International licences accepted" value={!!watch("internationalLicenceAccepted")} onChange={(v) => setCustom("internationalLicenceAccepted", v)} />
          </FieldGroup>
          <FieldGroup title="Pets & smoking">
            <ToggleRow title="Pets allowed" value={!!watch("petsAllowed")} onChange={(v) => setCustom("petsAllowed", v)} />
            <ToggleRow title="Smoking allowed" value={!!watch("smokingAllowed")} onChange={(v) => setCustom("smokingAllowed", v)} />
          </FieldGroup>
        </StepShell>
      );

    case "delivery":
      return (
        <StepShell title="Pickup & delivery" subtitle="How does the guest get the vehicle? All optional.">
          <FieldGroup title="Delivery">
            <ToggleRow title="I can deliver the vehicle" value={!!watch("deliveryAvailable")} onChange={(v) => setCustom("deliveryAvailable", v)} />
            {watch("deliveryAvailable") && (
              <div className="grid gap-6 sm:grid-cols-2">
                <NumberField id="deliveryRadiusKm" label="Delivery radius (km)" register={register} errors={errors} />
                <NumberField id="deliveryFee" label="Delivery fee (AUD)" register={register} errors={errors} />
              </div>
            )}
            <ToggleRow title="Airport pickup / drop-off" value={!!watch("airportPickup")} onChange={(v) => setCustom("airportPickup", v)} />
            {watch("airportPickup") && <NumberField id="airportPickupFee" label="Airport fee (AUD) — optional" register={register} errors={errors} />}
          </FieldGroup>
          <FieldGroup title="Handover">
            <OptionSelector label="Handover method" options={HANDOVER_METHOD_OPTIONS} value={watch("handoverMethod")} onChange={(v) => setCustom("handoverMethod", v)} columns={3} allowDeselect />
            <div className="grid gap-6 sm:grid-cols-2">
              <Input id="pickupWindowStart" label="Pickup from (time)" register={register} errors={errors} placeholder="e.g. 08:00" />
              <Input id="pickupWindowEnd" label="Pickup until (time)" register={register} errors={errors} placeholder="e.g. 20:00" />
            </div>
            <Input id="pickupInstructions" label="Pickup instructions — optional" register={register} errors={errors} placeholder="e.g. Meet at the front of the building, parking is on level 2" />
          </FieldGroup>
          <FieldGroup title="Languages you speak">
            <ChipMultiSelect items={LANGUAGE_OPTIONS} selected={languagesSpoken} onToggle={toggleLanguage} disabled={submitting} />
          </FieldGroup>
        </StepShell>
      );

    case "price":
      return (
        <StepShell title="Set your daily price" subtitle="This is what a guest pays per day, before Redrive's service fee. You can adjust it whenever you like.">
          <Input id="price" label="Daily price (AUD)" formatPrice type="number" register={register} errors={errors} required />
          <FieldGroup title="Longer-trip discounts — optional">
            <div className="grid gap-6 sm:grid-cols-2">
              <NumberField id="weeklyDiscountPercent" label="Weekly discount (%)" register={register} errors={errors} placeholder="e.g. 10" />
              <NumberField id="monthlyDiscountPercent" label="Monthly discount (%)" register={register} errors={errors} placeholder="e.g. 25" />
            </div>
            <p className="text-xs leading-5 text-muted">Discounts are shown to guests now. They&rsquo;ll be applied automatically in the quote in a later update.</p>
          </FieldGroup>
          <FieldGroup title="Security deposit — optional">
            <NumberField id="securityDeposit" label="Security deposit / bond (AUD)" register={register} errors={errors} />
            <OptionSelector label="How it's held" options={DEPOSIT_HOLD_OPTIONS} value={watch("depositHoldMethod")} onChange={(v) => setCustom("depositHoldMethod", v)} allowDeselect />
          </FieldGroup>
          <FieldGroup title="Other fees guests should expect — optional">
            <div className="grid gap-6 sm:grid-cols-2">
              <NumberField id="lateReturnFeePerHour" label="Late return (AUD/hour)" register={register} errors={errors} />
              <NumberField id="refuellingFeePerLitre" label="Refuelling (AUD/L)" register={register} errors={errors} />
              <NumberField id="finesAdminFee" label="Fine / infringement admin fee (AUD)" register={register} errors={errors} />
            </div>
            <OptionSelector label="Tolls" options={TOLL_HANDLING_OPTIONS} value={watch("tollHandling")} onChange={(v) => setCustom("tollHandling", v)} columns={3} allowDeselect />
          </FieldGroup>
          <FieldGroup title="Roadside assistance">
            <ToggleRow title="Roadside assistance included" value={!!watch("roadsideAssistanceIncluded")} onChange={(v) => setCustom("roadsideAssistanceIncluded", v)} />
            {watch("roadsideAssistanceIncluded") && <Input id="roadsideAssistanceProvider" label="Provider — optional" register={register} errors={errors} placeholder="e.g. NRMA, RACV" />}
          </FieldGroup>
        </StepShell>
      );

    case "cleaning":
      return (
        <StepShell title="Cleaning fees" subtitle="Optional. Charge a flat cleaning fee up front, or ask for it only if the vehicle comes back needing work.">
          <div className="flex flex-col gap-3">
            {[
              { value: "NO", label: "No cleaning fee" },
              { value: "YES", label: "Charge a fixed cleaning fee" },
              { value: "UPON_RETURNING", label: "Only charge if returned unclean" },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 text-sm font-medium transition ${
                  cleaningFeeOption === option.value ? "border-ink bg-surface-soft text-ink" : "border-hairline text-ink hover:border-ink"
                }`}
              >
                <input
                  type="radio"
                  className="accent-ink"
                  value={option.value}
                  checked={cleaningFeeOption === option.value}
                  onChange={() => setCustom("cleaningFeeOption", option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          {cleaningFeeOption === "YES" && (
            <Input id="cleaningFeeAmount" label="Cleaning fee (AUD)" type="number" register={register} errors={errors} required />
          )}
          {cleaningFeeOption === "UPON_RETURNING" && (
            <Input id="returnCleaningFeeAmount" label="Amount charged on return (AUD)" type="number" register={register} errors={errors} required />
          )}
        </StepShell>
      );

    case "cancellation":
      return (
        <StepShell title="Choose a cancellation policy" subtitle="Guests see this before they request. Existing bookings keep the policy agreed at the time.">
          <CancellationPolicySelector value={cancellationPolicy} onChange={(value) => setCustom("cancellationPolicy", value)} disabled={submitting} />
          <p className="rounded-xl bg-surface-soft p-4 text-xs leading-5 text-muted">
            If you cancel as the host before pickup, the guest always receives a full refund. Consumer rights and
            exceptional-circumstance reviews still apply regardless of the policy you pick.
          </p>
        </StepShell>
      );

    case "review": {
      const v = getValues();
      const rows: { label: string; value: string; step: StepId; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
        { label: "Category", value: v.category || "—", step: "category", icon: CarFront },
        { label: "Location", value: [selectedSuburb?.value, selectedState?.value].filter(Boolean).join(", ") || "—", step: "location", icon: MapPin },
        { label: "Vehicle", value: [v.company, v.modal, v.year].filter(Boolean).join(" ") || "—", step: "vehicle", icon: PencilLine },
        { label: "Powertrain", value: [v.fuelType, v.driveChain].filter(Boolean).join(" · ") || "—", step: "powertrain", icon: Gauge },
        { label: "Transmission", value: optionLabel("transmission", v.transmission) || "—", step: "basics", icon: Gauge },
        { label: "Photos", value: `${imageSrcs.length} added`, step: "photos", icon: ImagePlus },
        { label: "Title", value: v.title || "—", step: "title", icon: PencilLine },
        { label: "Amenities", value: selectedAmenities.length ? `${selectedAmenities.length} selected` : "None", step: "amenities", icon: ListChecks },
        { label: "Safety features", value: safetyFeatures.length ? `${safetyFeatures.length} selected` : "None", step: "safety", icon: BadgeCheck },
        {
          label: "Km allowance",
          value: v.dailyKmAllowance ? `${v.dailyKmAllowance} km/day` : "Unlimited",
          step: "rules",
          icon: Gauge,
        },
        {
          label: "Pickup & delivery",
          value: [v.deliveryAvailable ? "Delivery" : null, v.airportPickup ? "Airport" : null].filter(Boolean).join(" · ") || "Pickup only",
          step: "delivery",
          icon: MapPin,
        },
        { label: "Daily price", value: v.price ? `AU$${v.price}` : "—", step: "price", icon: Wallet },
        { label: "Security deposit", value: v.securityDeposit ? `AU$${v.securityDeposit}` : "None", step: "price", icon: Wallet },
        {
          label: "Cancellation",
          value: CANCELLATION_POLICIES.find((p) => p.key === (v.cancellationPolicy || "MODERATE"))?.name || "—",
          step: "cancellation",
          icon: BadgeCheck,
        },
      ];
      return (
        <StepShell title="Review and publish" subtitle="Check everything reads well. You can edit any section, and change it again after publishing.">
          <div className="overflow-hidden rounded-2xl border border-hairline-soft">
            {imageSrcs[0] && (
              <div className="relative aspect-[16/9] w-full bg-surface-strong">
                <Image src={imageSrcs[0]} alt="Main listing photo" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
              </div>
            )}
            <ul className="divide-y divide-hairline-soft">
              {rows.map((row) => (
                <li key={row.label} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary">
                    <row.icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.13em] text-muted-soft">{row.label}</span>
                    <span className="block truncate text-sm font-semibold text-ink">{row.value}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => goToStep(row.step)}
                    className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {address.trim() ? null : (
            <p className="text-xs text-muted">Tip: adding the exact street address helps us verify your vehicle faster.</p>
          )}
        </StepShell>
      );
    }

    default:
      return null;
  }
}
