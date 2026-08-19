/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  Heart,
  KeyRound,
  LockKeyhole,
  MailCheck,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import Input from "@/app/components/inputs/Input";
import AddressAutocomplete, {
  type ParsedAddress,
} from "@/app/components/inputs/AddressAutocomplete";
import PasswordField, {
  isStrongPassword,
} from "@/app/components/inputs/PasswordField";
import ImageUpload from "@/app/components/inputs/ImageUpload";
import SuburbSelector, {
  type SuburbOption,
} from "@/app/components/inputs/SuburbSelector";
import StateSelector, {
  states as AU_STATES,
} from "@/app/components/inputs/StateSelector";
import Button from "@/app/components/Button";
import type { SafeUser } from "@/app/types";
import {
  isValidAustralianMobile,
  isValidDateOfBirth,
} from "@/app/libs/profileValidation";
import { hasSubmittedLicense } from "@/app/libs/licenseVerification";
import PayoutSettings from "@/app/components/payments/PayoutSettings";
import EmailVerification from "@/app/components/profile/EmailVerification";

interface ProfileFormData {
  name: string;
  email: string;
  number: string;
  dateOfBirth: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  hobbies: string;
  dreamDestinations: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SectionCard = ({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section
    id={id}
    className="scroll-mt-32 rounded-md border border-hairline-soft bg-white p-5 sm:p-8"
  >
    <div className="mb-7 flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink">
        {icon}
      </div>
      <div>
        <h2 className="text-display-sm font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
    {children}
  </section>
);

export default function ProfileClient({
  initialUser,
}: {
  initialUser: SafeUser & { hasPassword: boolean };
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: initialUser.name || "",
      email: initialUser.email || "",
      number: initialUser.number || "",
      dateOfBirth: initialUser.dateOfBirth || "",
      streetAddress: initialUser.streetAddress || "",
      suburb: initialUser.suburb || "",
      state: initialUser.state || "",
      postcode: initialUser.postcode || "",
      hobbies: initialUser.hobbies?.join(", ") || "",
      dreamDestinations: initialUser.dreamDestinations?.join(", ") || "",
    },
  });
  const passwordForm = useForm<PasswordFormData>();

  const [image, setImage] = useState(
    initialUser.image || "/images/placeholder.png",
  );
  const [licenseImage, setLicenseImage] = useState(
    initialUser.licenseImage || "",
  );
  const [licenseType, setLicenseType] = useState(
    initialUser.licenseType || "Driver License",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingOtp, setIsUpdatingOtp] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [triggerUpload, setTriggerUpload] = useState(false);
  const [selectedState, setSelectedState] = useState<{
    value: string;
    label: string;
  } | null>(() => {
    if (!initialUser.state) return null;
    return (
      AU_STATES.find((item) => item.value === initialUser.state) || {
        value: initialUser.state,
        label: initialUser.state,
      }
    );
  });
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbOption | null>(
    () =>
      initialUser.suburb
        ? {
            value: initialUser.suburb,
            label: initialUser.postcode
              ? `${initialUser.suburb}, ${initialUser.postcode}`
              : initialUser.suburb,
            postcode: initialUser.postcode
              ? Number(initialUser.postcode)
              : undefined,
            state: initialUser.state || undefined,
          }
        : null,
  );
  const [destinations, setDestinations] = useState<string[]>(
    initialUser.dreamDestinations || [],
  );
  const [destinationInput, setDestinationInput] = useState("");
  const [profileVerified] = useState(initialUser.profileVerified || "N");
  const [emailVerified, setEmailVerified] = useState(Boolean(initialUser.emailVerified));
  const [loginOtpEnabled, setLoginOtpEnabled] = useState(
    Boolean(initialUser.loginOtpEnabled),
  );
  const [hasPassword] = useState(Boolean(initialUser.hasPassword));
  const licenseSubmitted = hasSubmittedLicense(licenseImage);

  const name = watch("name");
  const email = watch("email");
  const phone = watch("number");
  const dateOfBirth = watch("dateOfBirth");
  const streetAddress = watch("streetAddress");
  const hobbies = watch("hobbies");
  const newPassword = passwordForm.watch("newPassword");

  const completion = useMemo(() => {
    const complete = [
      name,
      email,
      phone,
      dateOfBirth,
      streetAddress,
      selectedSuburb?.value,
      selectedState?.value,
      hobbies,
      image !== "/images/placeholder.png",
      licenseSubmitted,
    ].filter(Boolean).length;
    return Math.round((complete / 10) * 100);
  }, [
    name,
    email,
    phone,
    dateOfBirth,
    streetAddress,
    selectedSuburb,
    selectedState,
    hobbies,
    image,
    licenseSubmitted,
  ]);

  const onAddressSelect = (result: ParsedAddress) => {
    if (result.state) {
      const known = AU_STATES.find((item) => item.value === result.state);
      const nextState = known || { value: result.state, label: result.state };
      setSelectedState(nextState);
      setValue("state", nextState.value, { shouldDirty: true });
    }
    if (result.suburb) {
      const nextSuburb = {
        value: result.suburb,
        label: result.postcode
          ? `${result.suburb}, ${result.postcode}`
          : result.suburb,
        postcode: result.postcode ? Number(result.postcode) : undefined,
        state: result.state,
      };
      setSelectedSuburb(nextSuburb);
      setValue("suburb", result.suburb, { shouldDirty: true });
      setValue("postcode", result.postcode || "", { shouldDirty: true });
    }
  };

  const selectSuburb = (selected: SuburbOption) => {
    setSelectedSuburb(selected);
    setValue("suburb", selected.value, { shouldDirty: true });
    setValue("postcode", selected.postcode?.toString() || "", {
      shouldDirty: true,
    });
    if (selected.state) {
      const state = AU_STATES.find((item) => item.value === selected.state);
      if (state) {
        setSelectedState(state);
        setValue("state", state.value, { shouldDirty: true });
      }
    }
  };

  const selectState = (selected: { value: string; label: string }) => {
    setSelectedState(selected);
    setValue("state", selected.value, { shouldDirty: true });
    if (selectedSuburb?.state && selectedSuburb.state !== selected.value) {
      setSelectedSuburb(null);
      setValue("suburb", "", { shouldDirty: true });
      setValue("postcode", "", { shouldDirty: true });
    }
  };

  const addDestination = () => {
    const value = destinationInput.trim().replace(/,$/, "");
    if (
      !value ||
      destinations.some((item) => item.toLowerCase() === value.toLowerCase())
    )
      return;
    const next = [...destinations, value];
    setDestinations(next);
    setValue("dreamDestinations", next.join(", "), { shouldDirty: true });
    setDestinationInput("");
  };

  const removeDestination = (value: string) => {
    const next = destinations.filter((item) => item !== value);
    setDestinations(next);
    setValue("dreamDestinations", next.join(", "), { shouldDirty: true });
  };

  const saveProfile: SubmitHandler<ProfileFormData> = async (data) => {
    setIsSaving(true);
    try {
      await axios.put("/api/profile", {
        ...data,
        image,
        licenseImage,
        licenseType,
        hobbies: data.hobbies
          ? data.hobbies
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        dreamDestinations: destinations,
      });
      toast.success("Profile saved");
      router.refresh();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "We couldn’t save your changes",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateLoginOtp = async () => {
    const next = !loginOtpEnabled;
    setIsUpdatingOtp(true);
    setLoginOtpEnabled(next);
    try {
      await axios.patch("/api/profile/security", { loginOtpEnabled: next });
      window.dispatchEvent(new Event("redrive:notifications"));
      toast.success(
        next ? "Login verification enabled" : "Login verification disabled",
      );
    } catch (error: any) {
      setLoginOtpEnabled(!next);
      toast.error(
        error.response?.data?.error || "Security setting could not be changed",
      );
    } finally {
      setIsUpdatingOtp(false);
    }
  };

  const changePassword: SubmitHandler<PasswordFormData> = async (data) => {
    setIsChangingPassword(true);
    try {
      await axios.put("/api/profile/security", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      window.dispatchEvent(new Event("redrive:notifications"));
      passwordForm.reset();
      setShowPasswordForm(false);
      toast.success("Password updated");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Password could not be updated",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <main className="bg-surface-soft/40 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Account
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Your profile
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Keep your details current so every handover feels straightforward.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex items-center gap-3 rounded-full border border-hairline bg-white px-4 py-2.5">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-strong">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-ink">
                {completion}% complete
              </span>
            </div>
            <div className="w-full sm:w-44">
              <Button
                form="profile-form"
                type="submit"
                label="Save profile"
                loading={isSaving}
                loadingLabel="Saving"
              />
            </div>
          </div>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-5 lg:sticky lg:top-32">
            <div className="rounded-md border border-hairline-soft bg-white p-6 text-center">
              <div className="relative mx-auto h-28 w-28">
                <div className="h-full w-full overflow-hidden rounded-full border border-hairline bg-surface-soft">
                  <img
                    src={image}
                    alt={name || "Profile"}
                    width={112}
                    height={112}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setTriggerUpload(true)}
                  aria-label="Change profile photo"
                  className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-white bg-ink text-white shadow-card transition hover:scale-105"
                >
                  <Camera size={17} />
                </button>
              </div>
              {triggerUpload && (
                <ImageUpload
                  folder="profiles"
                  onChange={(url) => {
                    setImage(url);
                    setTriggerUpload(false);
                  }}
                  value={image}
                  triggerUpload
                />
              )}
              <h2 className="mt-5 truncate text-xl font-semibold text-ink">
                {name || "Your profile"}
              </h2>
              <p className="mt-1 truncate text-sm text-muted">{email}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {emailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-3 py-1 text-xs font-medium text-ink">
                    <Check size={12} /> Email verified
                  </span>
                )}
                {licenseSubmitted && profileVerified === "Y" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-3 py-1 text-xs font-medium text-ink">
                    <BadgeCheck size={13} /> Licence verified
                  </span>
                )}
                {licenseSubmitted && profileVerified === "PENDING" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    <ShieldCheck size={13} /> Licence submitted
                  </span>
                )}
              </div>
            </div>
            <nav className="hidden rounded-md border border-hairline-soft bg-white p-2 lg:block">
              {[
                ["personal", "Personal details"],
                ["email-verification", "Email verification"],
                ["address", "Address"],
                ["about", "About you"],
                ["verification", "Verification"],
                ["payouts", "Host payouts"],
                ["security", "Login & security"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={`#${href}`}
                  className="block rounded-sm px-4 py-3 text-sm font-medium text-muted transition hover:bg-surface-soft hover:text-ink"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <form
              id="profile-form"
              onSubmit={handleSubmit(saveProfile)}
              className="space-y-6"
            >
              <SectionCard
                id="personal"
                icon={<UserRound size={19} />}
                title="Personal details"
                description="The information hosts and guests use to recognise and contact you."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="name"
                    label="Full name"
                    register={register}
                    required
                    errors={errors}
                  />
                  <Input
                    id="number"
                    type="tel"
                    label="Mobile number"
                    register={register}
                    errors={errors}
                    validate={(value: string) =>
                      !value ||
                      isValidAustralianMobile(value) ||
                      "Enter a valid Australian mobile number"
                    }
                  />
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="dateOfBirth"
                      className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink"
                    >
                      <CalendarDays size={14} />
                      Date of birth
                    </label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      {...register("dateOfBirth", {
                        validate: (value) =>
                          !value ||
                          isValidDateOfBirth(value) ||
                          "Enter a valid date of birth",
                      })}
                      className={`h-14 w-full rounded-sm border bg-white px-4 text-sm text-ink outline-none focus:ring-1 focus:ring-ink ${errors.dateOfBirth ? "border-error" : "border-hairline focus:border-ink"}`}
                    />
                    {errors.dateOfBirth && (
                      <p className="mt-1 text-xs text-error">
                        {errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      id="email"
                      type="email"
                      label="Email address"
                      register={register}
                      disabled
                      errors={errors}
                    />
                    <p className="mt-2 text-xs text-muted">
                      Your sign-in email cannot be changed here.
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                id="email-verification"
                icon={<MailCheck size={19} />}
                title="Email verification"
                description="Confirm your sign-in email before sending a booking request."
              >
                <EmailVerification
                  email={initialUser.email || ""}
                  verified={emailVerified}
                  onVerified={() => {
                    setEmailVerified(true);
                    router.refresh();
                  }}
                />
              </SectionCard>

              <SectionCard
                id="address"
                icon={<MapPin size={19} />}
                title="Home address"
                description="Start with your street address—we’ll fill the suburb and state when possible."
              >
                <div className="space-y-4">
                  <AddressAutocomplete
                    id="streetAddress"
                    label="Number & street address"
                    register={register}
                    setValue={setValue}
                    errors={errors}
                    onSelect={onAddressSelect}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-ink">
                        Suburb
                      </label>
                      <SuburbSelector
                        state={selectedState?.value}
                        value={selectedSuburb || undefined}
                        allowAllStates
                        onChange={selectSuburb}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-ink">
                        State
                      </label>
                      <StateSelector
                        value={selectedState}
                        onChange={selectState}
                      />
                    </div>
                  </div>
                  <input type="hidden" {...register("suburb")} />
                  <input type="hidden" {...register("state")} />
                  <input type="hidden" {...register("postcode")} />
                  {selectedSuburb?.postcode && (
                    <p className="text-xs text-muted">
                      Postcode {selectedSuburb.postcode} will be saved with this
                      address.
                    </p>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                id="about"
                icon={<Heart size={19} />}
                title="A little about you"
                description="Add details that make conversations and handovers more personal."
              >
                <div className="space-y-5">
                  <Input
                    id="hobbies"
                    label="Hobbies, separated by commas"
                    register={register}
                    errors={errors}
                  />
                  <div>
                    <label
                      htmlFor="destination"
                      className="mb-2 block text-xs font-semibold text-ink"
                    >
                      Dream destinations
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="destination"
                        value={destinationInput}
                        onChange={(event) =>
                          setDestinationInput(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === ",") {
                            event.preventDefault();
                            addDestination();
                          }
                        }}
                        placeholder="Type a place and press Enter"
                        className="h-12 min-w-0 flex-1 rounded-sm border border-hairline bg-white px-4 text-sm text-ink outline-none transition focus:border-ink focus:ring-1 focus:ring-ink"
                      />
                      <button
                        type="button"
                        onClick={addDestination}
                        className="rounded-sm border border-ink px-4 text-sm font-semibold text-ink transition hover:bg-surface-soft"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {destinations.map((destination) => (
                        <span
                          key={destination}
                          className="inline-flex items-center gap-2 rounded-full bg-surface-soft px-3 py-2 text-xs text-ink"
                        >
                          {destination}
                          <button
                            type="button"
                            onClick={() => removeDestination(destination)}
                            aria-label={`Remove ${destination}`}
                            className="text-muted hover:text-ink"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                      {!destinations.length && (
                        <span className="text-xs text-muted">
                          No destinations added yet.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                id="verification"
                icon={<ShieldCheck size={19} />}
                title="Driving licence"
                description="A licence upload is required before you can request a vehicle booking."
              >
                <div className="space-y-4">
                  {!licenseSubmitted && (
                    <div className="rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                      <strong>Booking is currently locked.</strong> Upload your
                      licence to continue to booking review.
                    </div>
                  )}
                  {licenseSubmitted && profileVerified !== "Y" && (
                    <div className="rounded-sm border border-hairline-soft bg-surface-soft p-4 text-sm leading-6 text-ink">
                      Your licence is on file and awaiting profile verification.
                      You can now send booking requests.
                    </div>
                  )}
                  <select
                    value={licenseType}
                    onChange={(event) => setLicenseType(event.target.value)}
                    className="h-14 w-full rounded-sm border border-hairline bg-white px-4 text-sm text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  >
                    <option>Driver License</option>
                    <option>Boat License</option>
                    <option>Other License</option>
                  </select>
                  <ImageUpload
                    folder="licenses"
                    onChange={setLicenseImage}
                    value={licenseImage}
                  />
                  <p className="flex gap-2 text-xs leading-5 text-muted">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                    Only upload a document you are authorised to provide. Avoid
                    including unrelated personal documents.
                  </p>
                </div>
              </SectionCard>
            </form>

            <PayoutSettings />

            <SectionCard
              id="security"
              icon={<LockKeyhole size={19} />}
              title="Login & security"
              description="Control how your account is protected when you sign in."
            >
              <div className="divide-y divide-hairline-soft rounded-md border border-hairline-soft">
                <div className="flex items-start justify-between gap-5 p-5">
                  <div className="flex gap-3">
                    <div className="mt-0.5 text-primary">
                      <KeyRound size={19} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        Email code at login
                      </h3>
                      <p
                        id="login-verification-description"
                        className="mt-1 max-w-md text-xs leading-5 text-muted"
                      >
                        {hasPassword
                          ? "After your password is accepted, we’ll email a one-time code before opening your account."
                          : "Google sign-in uses your Google account security, so this setting applies only to password accounts."}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={loginOtpEnabled}
                      aria-describedby="login-verification-description login-verification-status"
                      disabled={isUpdatingOtp || !hasPassword}
                      onClick={updateLoginOtp}
                      className={`group relative h-9 w-[4.25rem] overflow-hidden rounded-full border p-1 transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${loginOtpEnabled ? "border-primary bg-primary shadow-[0_0_0_4px_rgba(8,121,133,0.10)]" : "border-hairline bg-surface-strong"} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 text-[9px] font-bold uppercase tracking-wide transition-opacity duration-200 ${loginOtpEnabled ? "left-2.5 flex items-center text-white opacity-100" : "opacity-0"}`}
                      >
                        On
                      </span>
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 right-2 flex items-center text-[9px] font-bold uppercase tracking-wide text-muted transition-opacity duration-200 ${loginOtpEnabled ? "opacity-0" : "opacity-100"}`}
                      >
                        Off
                      </span>
                      <span
                        className={`relative flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${loginOtpEnabled ? "translate-x-8 rotate-0" : "translate-x-0 -rotate-12"}`}
                      >
                        {isUpdatingOtp ? (
                          <span className="loader-orbit h-3.5 w-3.5 rounded-full border-2 border-hairline border-t-primary" />
                        ) : loginOtpEnabled ? (
                          <Check size={15} strokeWidth={3} />
                        ) : (
                          <X size={14} />
                        )}
                      </span>
                    </button>
                    <span
                      id="login-verification-status"
                      role="status"
                      aria-live="polite"
                      className={`text-[11px] font-semibold transition-colors ${loginOtpEnabled ? "text-primary" : "text-muted"}`}
                    >
                      {isUpdatingOtp
                        ? "Saving…"
                        : loginOtpEnabled
                          ? "Verification on"
                          : "Verification off"}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-5">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        Password
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {hasPassword
                          ? "Use a unique password you don’t use elsewhere."
                          : "This account currently signs in with Google."}
                      </p>
                    </div>
                    {hasPassword && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswordForm((current) => !current)
                        }
                        className="shrink-0 text-sm font-semibold text-ink underline underline-offset-4"
                      >
                        {showPasswordForm ? "Cancel" : "Update"}
                      </button>
                    )}
                  </div>
                  {hasPassword && showPasswordForm && (
                    <form
                      onSubmit={passwordForm.handleSubmit(changePassword)}
                      className="mt-6 space-y-4 rounded-md bg-surface-soft p-4 sm:p-5"
                    >
                      <PasswordField
                        id="currentPassword"
                        label="Current password"
                        autoComplete="current-password"
                        register={passwordForm.register}
                        errors={passwordForm.formState.errors}
                      />
                      <PasswordField
                        id="newPassword"
                        label="New password"
                        autoComplete="new-password"
                        register={passwordForm.register}
                        errors={passwordForm.formState.errors}
                        valueForStrength={newPassword || ""}
                        showRequirements
                        validate={(value) =>
                          isStrongPassword(value) ||
                          "Complete all password requirements"
                        }
                      />
                      <PasswordField
                        id="confirmPassword"
                        label="Confirm new password"
                        autoComplete="new-password"
                        register={passwordForm.register}
                        errors={passwordForm.formState.errors}
                        validate={(value) =>
                          value === newPassword || "Passwords do not match"
                        }
                      />
                      <div className="pt-1 sm:ml-auto sm:w-44">
                        <Button
                          type="submit"
                          label="Change password"
                          loading={isChangingPassword}
                          loadingLabel="Updating"
                        />
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </SectionCard>

            <div className="flex items-center gap-3 rounded-md bg-ink p-5 text-white sm:p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Sparkles size={19} />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  A stronger profile builds trust
                </p>
                <p className="mt-1 text-xs leading-5 text-white/70">
                  Complete details, a clear photo and login verification help
                  both sides feel ready before a trip.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
