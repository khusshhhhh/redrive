"use client";

import { useCallback, useMemo, useState } from "react";
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
  CheckCircle2,
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
import DateSelector from "@/app/components/inputs/DateSelector";
import Counter from "@/app/components/inputs/Counter";
import Input from "@/app/components/inputs/Input";
import TextArea from "@/app/components/inputs/TextArea";
import YearSelect from "@/app/components/inputs/YearSelect";
import FuelSelector from "@/app/components/inputs/FuelSelector";
import DriveChainSelector from "@/app/components/inputs/DriveChainSelector";
import ListingPhotoManager from "@/app/components/inputs/ListingPhotoManager";
import ImageUpload from "@/app/components/inputs/ImageUpload";
import CancellationPolicySelector from "@/app/components/listings/CancellationPolicySelector";
import { CANCELLATION_POLICIES } from "@/app/libs/cancellationPolicy";

type StepId =
  | "category"
  | "location"
  | "basics"
  | "vehicle"
  | "powertrain"
  | "photos"
  | "title"
  | "description"
  | "information"
  | "amenities"
  | "registration"
  | "price"
  | "cleaning"
  | "cancellation"
  | "review";

const PHASES: { key: string; label: string; name: string; steps: StepId[] }[] = [
  { key: "about", label: "Part 1", name: "Tell us about your vehicle", steps: ["category", "location", "basics", "vehicle", "powertrain"] },
  { key: "standout", label: "Part 2", name: "Make it stand out", steps: ["photos", "title", "description", "information", "amenities"] },
  { key: "finish", label: "Part 3", name: "Finish up and publish", steps: ["registration", "price", "cleaning", "cancellation", "review"] },
];

const STEP_ORDER: StepId[] = PHASES.flatMap((phase) => phase.steps);

const phaseForStep = (id: StepId) => PHASES.find((phase) => phase.steps.includes(id))!;

export default function HostFlow() {
  const router = useRouter();
  const { currentUser, isLoading: sessionLoading } = useCurrentUser();
  const loginModal = useLoginModal();

  const [view, setView] = useState<"intro" | "flow">("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [published, setPublished] = useState(false);

  const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(null);
  const [selectedSuburb, setSelectedSuburb] = useState<{ value: string; label: string } | null>(null);
  const [address, setAddress] = useState("");
  const [imageSrcs, setImageSrcs] = useState<string[]>([]);
  const [regoImage, setRegoImage] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const {
    register,
    setValue,
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
      regoEndDate: new Date(),
      cleaningFeeOption: "NO",
      cleaningFeeAmount: "",
      returnCleaningFeeAmount: "",
      cancellationPolicy: "MODERATE",
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

  const Map = useMemo(
    () => dynamic(() => import("@/app/components/Map"), { ssr: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedState, selectedSuburb],
  );

  const onAddressSelect = useCallback((result: ParsedAddress) => {
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
  }, []);

  const toggleAmenity = (id: string) =>
    setSelectedAmenities((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const currentStep = STEP_ORDER[stepIndex];
  const totalSteps = STEP_ORDER.length;
  const progress = view === "intro" ? 0 : Math.round(((stepIndex + 1) / totalSteps) * 100);

  const validateStep = useCallback(
    async (id: StepId): Promise<string | null> => {
      const values = getValues();
      switch (id) {
        case "category":
          return values.category ? null : "Choose the category that fits your vehicle.";
        case "location":
          if (!address.trim()) return "Add the street address so we can place your vehicle.";
          if (!selectedSuburb?.value) return "Select the suburb.";
          if (!selectedState?.value) return "Select the state.";
          return null;
        case "vehicle": {
          const ok = await trigger(["company", "modal", "year"]);
          return ok ? null : "Add the make, model and year.";
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
    const index = STEP_ORDER.indexOf(id);
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
      state: selectedState?.value,
      suburb: selectedSuburb?.value,
      address: address.trim() !== "" ? address : "Unknown",
      cleaningFeeOption: data.cleaningFeeOption,
      cleaningFeeAmount: data.cleaningFeeAmount || null,
      returnCleaningFeeAmount: data.returnCleaningFeeAmount || null,
    };

    try {
      await axios.post("/api/listings", payload, { headers: { "Content-Type": "application/json" } });
      setPublished(true);
      toast.success("Your listing is live!");
      setTimeout(() => {
        router.push("/properties");
        router.refresh();
      }, 1400);
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : null;
      toast.error(message || "Something went wrong while publishing. Please try again.");
      setSubmitting(false);
    }
  }, [address, getValues, imageSrcs, regoImage, router, selectedAmenities, selectedState, selectedSuburb]);

  const next = useCallback(async () => {
    const error = await validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }
    if (stepIndex === totalSteps - 1) {
      void publish();
      return;
    }
    setStepIndex((value) => value + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, publish, stepIndex, totalSteps, validateStep]);

  const back = useCallback(() => {
    if (stepIndex === 0) {
      setView("intro");
      return;
    }
    setStepIndex((value) => value - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex]);

  /* ---- gates ------------------------------------------------------------- */

  if (sessionLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={30} aria-label="Loading" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
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
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="animate-pop flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white">
          <CheckCircle2 size={38} />
        </span>
        <h1 className="mt-6 text-display-2xl font-extrabold tracking-tight text-ink">Your listing is live</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Taking you to your listings so you can set availability…</p>
      </div>
    );
  }

  /* ---- intro ----------------------------------------------------------- */

  if (view === "intro") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16 lg:py-20">
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
              { n: 1, name: "Tell us about your vehicle", copy: "Category, location and the specs guests filter by.", icon: CarFront },
              { n: 2, name: "Make it stand out", copy: "Add photos, a title, a description and amenities.", icon: Camera },
              { n: 3, name: "Finish up and publish", copy: "Registration, price, cleaning fees and cancellation.", icon: BadgeCheck },
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
    );
  }

  /* ---- flow ---------------------------------------------------------------- */

  const phase = phaseForStep(currentStep);
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div className="min-h-screen">
      {/* progress */}
      <div
        className="sticky z-20 border-b border-hairline-soft bg-white/90 backdrop-blur"
        style={{ top: "var(--app-header-height, 64px)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-soft">
            {phase.label} &middot; {phase.name}
          </p>
          <p className="text-[11px] font-semibold text-muted">
            {stepIndex + 1} / {totalSteps}
          </p>
        </div>
        <div className="h-1 w-full bg-surface-strong">
          <div className="host-progress-fill h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 pb-40 pt-8 sm:px-8 sm:pt-12">
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
            setAddress={setAddress}
            onAddressSelect={onAddressSelect}
            MapComponent={Map}
            imageSrcs={imageSrcs}
            setImageSrcs={setImageSrcs}
            setUploadingPhotos={setUploadingPhotos}
            regoImage={regoImage}
            setRegoImage={setRegoImage}
            selectedAmenities={selectedAmenities}
            toggleAmenity={toggleAmenity}
            address={address}
            goToStep={goToStep}
            submitting={submitting}
          />
        </div>
      </div>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MapComponent: any;
  imageSrcs: string[];
  setImageSrcs: (v: string[]) => void;
  setUploadingPhotos: (v: boolean) => void;
  regoImage: string;
  setRegoImage: (v: string) => void;
  selectedAmenities: string[];
  toggleAmenity: (id: string) => void;
  address: string;
  goToStep: (id: StepId) => void;
  submitting: boolean;
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
    MapComponent,
    imageSrcs,
    setImageSrcs,
    setUploadingPhotos,
    regoImage,
    setRegoImage,
    selectedAmenities,
    toggleAmenity,
    address,
    goToStep,
    submitting,
  } = props;

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
        <StepShell title="Where is your vehicle kept?" subtitle="Guests only ever see the suburb — the exact address stays private until a booking is confirmed.">
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
            <div className="overflow-hidden rounded-xl border border-hairline-soft">
              <MapComponent suburb={selectedSuburb?.value} state={selectedState?.value} />
            </div>
          </div>
        </StepShell>
      );

    case "basics":
      return (
        <StepShell title="Share a few basics" subtitle="Set these to zero if they don't apply to your vehicle.">
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
        </StepShell>
      );

    case "vehicle":
      return (
        <StepShell title="What is it, exactly?" subtitle="The make, model and year guests see on your listing.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Input id="company" label="Make" placeholder="e.g. Ford" register={register} errors={errors} required />
            <Input id="modal" label="Model" placeholder="e.g. Ranger Raptor" register={register} errors={errors} required />
          </div>
          <YearSelect id="year" label="Manufacturing year" setValue={setValue} watch={watch} register={register} errors={errors} required />
        </StepShell>
      );

    case "powertrain":
      return (
        <StepShell title="How does it drive?" subtitle="Guests filter on fuel type and drivetrain when they plan trips.">
          <FuelSelector id="fuelType" label="Fuel type" watch={watch} setValue={setValue} errors={errors} required />
          <DriveChainSelector id="driveChain" label="Drive chain" watch={watch} setValue={setValue} errors={errors} required />
          <Input id="fuelEconomy" label="Fuel economy (L/100km) — optional" type="number" register={register} errors={errors} required={false} />
        </StepShell>
      );

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
            <DateSelector value={regoEndDate} onChange={(value) => setCustom("regoEndDate", value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Registration document — optional</label>
            {regoImage ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-hairline-soft">
                <Image alt="Registration document preview" src={regoImage} fill className="object-cover" />
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

    case "price":
      return (
        <StepShell title="Set your daily price" subtitle="This is what a guest pays per day, before Redrive's service fee. You can adjust it whenever you like.">
          <Input id="price" label="Daily price (AUD)" formatPrice type="number" register={register} errors={errors} required />
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
        { label: "Photos", value: `${imageSrcs.length} added`, step: "photos", icon: ImagePlus },
        { label: "Title", value: v.title || "—", step: "title", icon: PencilLine },
        { label: "Amenities", value: selectedAmenities.length ? `${selectedAmenities.length} selected` : "None", step: "amenities", icon: ListChecks },
        { label: "Daily price", value: v.price ? `AU$${v.price}` : "—", step: "price", icon: Wallet },
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
                <Image src={imageSrcs[0]} alt="Main listing photo" fill className="object-cover" />
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
