"use client";

import axios from "axios";
import { signIn } from "next-auth/react";
import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "@/app/libs/toast";
import { FcGoogle } from "react-icons/fc";
import { CarFront, Check, Heart, LogIn, Mail, MailCheck, MapPin, ShieldCheck, Smartphone, UserRound } from "lucide-react";

import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import { isAtLeast18, isValidAustralianMobile, isValidDateOfBirth } from "@/app/libs/profileValidation";
import Input from "../inputs/Input";
import AddressAutocomplete, { type ParsedAddress } from "../inputs/AddressAutocomplete";
import PasswordField, { isStrongPassword } from "../inputs/PasswordField";
import SignupImagePicker from "../inputs/SignupImagePicker";
import SuburbSelector, { type SuburbOption } from "../inputs/SuburbSelector";
import StateSelector, { states as AU_STATES } from "../inputs/StateSelector";
import Button from "../Button";
import Modal from "./Modal";

type RegisterStage = "account" | "profile" | "about" | "verify" | "success";
type UploadFolder = "profiles";

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<RegisterStage>("account");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [selectedState, setSelectedState] = useState<{ value: string; label: string } | null>(null);
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbOption | null>(null);
  const [existingEmailNotice, setExistingEmailNotice] = useState<{ email: string; verified: boolean } | null>(null);

  const { register, handleSubmit, watch, setValue, getValues, trigger, setError, clearErrors, formState: { errors } } = useForm<FieldValues>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", number: "", dateOfBirth: "", streetAddress: "", suburb: "", state: "", postcode: "", hobbies: "", dreamDestinations: "" },
    mode: "onChange",
  });

  const password = watch("password");

  const onAddressSelect = (result: ParsedAddress) => {
    if (result.state) {
      const nextState = AU_STATES.find((item) => item.value === result.state) || { value: result.state, label: result.state };
      setSelectedState(nextState);
      setValue("state", nextState.value, { shouldValidate: true });
    }
    if (result.suburb) {
      const nextSuburb: SuburbOption = { value: result.suburb, label: result.postcode ? `${result.suburb}, ${result.postcode}` : result.suburb, postcode: result.postcode ? Number(result.postcode) : undefined, state: result.state };
      setSelectedSuburb(nextSuburb);
      setValue("suburb", result.suburb, { shouldValidate: true });
      setValue("postcode", result.postcode || "", { shouldValidate: true });
    }
  };

  const selectSuburb = (selected: SuburbOption) => {
    setSelectedSuburb(selected);
    setValue("suburb", selected.value, { shouldValidate: true });
    setValue("postcode", selected.postcode?.toString() || "", { shouldValidate: true });
    if (selected.state) {
      const stateOption = AU_STATES.find((item) => item.value === selected.state);
      if (stateOption) { setSelectedState(stateOption); setValue("state", stateOption.value, { shouldValidate: true }); }
    }
  };

  const selectState = (selected: { value: string; label: string }) => {
    setSelectedState(selected);
    setValue("state", selected.value, { shouldValidate: true });
    if (selectedSuburb?.state && selectedSuburb.state !== selected.value) {
      setSelectedSuburb(null);
      setValue("suburb", "", { shouldValidate: true });
      setValue("postcode", "", { shouldValidate: true });
    }
  };

  const nextStep = async () => {
    const fields = stage === "account" ? ["name", "email", "password", "confirmPassword"] : ["number", "dateOfBirth", "streetAddress", "suburb", "state"];
    if (!(await trigger(fields))) return;
    if (stage === "account") {
      const email = getValues("email")?.trim().toLowerCase();
      setIsLoading(true);
      try {
        const response = await axios.get("/api/register", { params: { email } });
        if (response.data.exists) {
          setExistingEmailNotice({ email, verified: response.data.emailVerified });
          setError("email", { type: "duplicate", message: "Email already registered" });
          return;
        }
      } catch (error: unknown) {
        if (axios.isAxiosError<{ error?: string }>(error) && error.response?.status === 400) {
          setError("email", { type: "validate", message: error.response.data.error || "Enter a valid email address" });
          return;
        }
        // The final POST performs the same check, so a temporary availability
        // check failure should not strand a legitimate new user on step one.
      } finally { setIsLoading(false); }
      setExistingEmailNotice(null);
      clearErrors("email");
      setStage("profile");
      return;
    }
    setStage("about");
  };

  const previousStep = () => {
    if (stage === "profile") setStage("account");
    if (stage === "about") setStage("profile");
  };

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...formData } = data;
      void confirmPassword;
      const response = await axios.post("/api/register", formData, { headers: { "Content-Type": "application/json" } });
      setVerificationEmail(formData.email.trim().toLowerCase());
      setPreviewCode(response.data.previewCode || "");
      setStage("verify");
      toast.success("Verification code sent");
    } catch (error: unknown) {
      if (axios.isAxiosError<{ code?: string; emailVerified?: boolean; error?: string }>(error) && error.response?.status === 409 && error.response?.data?.code === "EMAIL_ALREADY_REGISTERED") {
        const email = data.email.trim().toLowerCase();
        setExistingEmailNotice({ email, verified: !!error.response.data.emailVerified });
        setError("email", { type: "duplicate", message: "Email already registered" });
        setStage("account");
      } else toast.error(axios.isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || "Unable to create account" : "Unable to create account");
    } finally { setIsLoading(false); }
  };

  const uploadFile = async (file: File, folder: UploadFolder) => {
    const upload = new FormData();
    upload.append("image", file);
    upload.append("folder", folder);
    const response = await axios.post("/api/upload", upload);
    return response.data.url as string;
  };

  const completeProfile = async () => {
    const profileResult = await Promise.allSettled([
      profileImage ? uploadFile(profileImage, "profiles") : Promise.resolve(""),
    ]);
    const image = profileResult[0].status === "fulfilled" ? profileResult[0].value : "";
    const data = getValues();
    await axios.put("/api/profile", { ...data, image, hobbies: data.hobbies ? data.hobbies.split(",").map((item: string) => item.trim()).filter(Boolean) : [], dreamDestinations: data.dreamDestinations ? data.dreamDestinations.split(",").map((item: string) => item.trim()).filter(Boolean) : [] });
    if (profileResult[0].status === "rejected") toast.error("Your account is ready, but the profile image could not be uploaded. You can retry from your profile.");
  };

  const verifyEmail = async () => {
    if (verificationCode.length !== 6) { toast.error("Enter the six-digit code"); return; }
    setIsLoading(true);
    try {
      await axios.post("/api/auth/verify-email", { email: verificationEmail, code: verificationCode });
    } catch (error: unknown) {
      toast.error(axios.isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || "Unable to verify email" : "Unable to verify email");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", { email: verificationEmail, password, redirect: false });
      if (result?.ok) {
        setSignedIn(true);
        await completeProfile();
      } else {
        toast.error("Email verified. Sign in to finish uploading your profile images.");
      }
    } catch {
      toast.error("Email verified. Finish any remaining details from your profile.");
    } finally {
      setStage("success");
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/auth/resend-verification", { email: verificationEmail });
      setPreviewCode(response.data.previewCode || ""); setVerificationCode(""); toast.success("A new code was sent");
    } catch (error: unknown) { toast.error(axios.isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || "Unable to resend code" : "Unable to resend code"); }
    finally { setIsLoading(false); }
  };

  const continueAfterVerification = () => {
    registerModal.onClose();
    if (signedIn) window.location.reload(); else loginModal.onOpen();
  };

  const continueExistingVerification = async () => {
    if (!existingEmailNotice) return;
    setIsLoading(true);
    try {
      const response = await axios.post("/api/auth/resend-verification", { email: existingEmailNotice.email });
      setVerificationEmail(existingEmailNotice.email);
      setPreviewCode(response.data.previewCode || "");
      setVerificationCode("");
      setExistingEmailNotice(null);
      setStage("verify");
      toast.success("A new verification code was sent");
    } catch (error: unknown) {
      toast.error(axios.isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || "Unable to send a verification code" : "Unable to send a verification code");
    } finally { setIsLoading(false); }
  };

  const toggle = useCallback(() => { registerModal.onClose(); loginModal.onOpen(); }, [loginModal, registerModal]);

  const accountContent = <div className="space-y-4"><SignupJourney step={1} /><StepProgress current={1} /><Input id="name" label="Full name" disabled={isLoading} register={register} errors={errors} required /><Input id="email" type="email" label="Email address" disabled={isLoading} register={register} errors={errors} required validate={(value: string) => /^\S+@\S+\.\S+$/.test(value.trim()) || "Enter a valid email address"} onChange={() => { if (existingEmailNotice) { setExistingEmailNotice(null); clearErrors("email"); } }} />{existingEmailNotice && <div role="status" className="rounded-xl border border-hairline bg-surface-soft p-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary"><MailCheck size={18} /></span><div><p className="text-sm font-semibold text-ink">{existingEmailNotice.verified ? "You already have a Redrive account" : "Your signup is already in progress"}</p><p className="mt-1 text-xs leading-5 text-muted">{existingEmailNotice.verified ? `${existingEmailNotice.email} is already registered. Sign in with your existing password to continue.` : `We found an unverified signup for ${existingEmailNotice.email}. Send a new verification code to continue safely.`}</p><button type="button" onClick={existingEmailNotice.verified ? toggle : continueExistingVerification} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline">{existingEmailNotice.verified ? <LogIn size={14} /> : <Mail size={14} />}{existingEmailNotice.verified ? "Sign in instead" : "Send verification code"}</button></div></div></div>}<PasswordField id="password" label="Create a password" autoComplete="new-password" errors={errors} disabled={isLoading} register={register} valueForStrength={password || ""} showRequirements validate={(value: string) => isStrongPassword(value) || "Complete all password requirements"} /><PasswordField id="confirmPassword" label="Confirm password" autoComplete="new-password" disabled={isLoading} register={register} errors={errors} validate={(value: string) => value === password || "Passwords do not match"} /></div>;

  const profileContent = <div className="space-y-4"><SignupJourney step={2} /><StepProgress current={2} /><SignupImagePicker label="Profile picture (optional)" description="Help hosts recognise you at handover." value={profileImage} onChange={setProfileImage} variant="avatar" /><Input id="number" type="tel" label="Australian mobile number" disabled={isLoading} register={register} errors={errors} required validate={(value: string) => isValidAustralianMobile(value) || "Enter a valid Australian mobile number"} /><p className="flex gap-2 text-xs leading-5 text-muted"><Smartphone size={14} className="mt-0.5 shrink-0" />We save your number securely. SMS ownership verification needs a delivery provider and is not enabled yet.</p><div><label htmlFor="signup-date-of-birth" className="mb-2 block text-xs font-semibold text-ink">Date of birth</label><input id="signup-date-of-birth" type="date" max={new Date().toISOString().slice(0, 10)} {...register("dateOfBirth", { required: "Enter your date of birth", validate: (value: string) => (isValidDateOfBirth(value) && isAtLeast18(value)) || "You must be at least 18" })} className={`h-14 w-full rounded-sm border bg-white px-4 text-sm text-ink outline-none focus:ring-1 focus:ring-ink ${errors.dateOfBirth ? "border-error" : "border-hairline focus:border-ink"}`} />{errors.dateOfBirth && <p className="mt-1 text-xs text-error">{String(errors.dateOfBirth.message || "Enter your date of birth")}</p>}</div><AddressAutocomplete id="streetAddress" label="Number & street address" disabled={isLoading} required register={register} setValue={setValue} errors={errors} onSelect={onAddressSelect} /><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-semibold text-ink">Suburb</label><SuburbSelector state={selectedState?.value} value={selectedSuburb || undefined} allowAllStates onChange={selectSuburb} /></div><div><label className="mb-2 block text-xs font-semibold text-ink">State</label><StateSelector value={selectedState} onChange={selectState} /></div></div><input type="hidden" {...register("suburb", { required: true })} /><input type="hidden" {...register("state", { required: true })} />{(errors.suburb || errors.state) && <p className="text-xs text-error">Choose your suburb and state.</p>}<input type="hidden" {...register("postcode")} /></div>;

  const aboutContent = <div className="space-y-4"><SignupJourney step={3} /><StepProgress current={3} /><Input id="hobbies" label="Hobbies, separated by commas" disabled={isLoading} register={register} errors={errors} /><Input id="dreamDestinations" label="Dream destinations, separated by commas" disabled={isLoading} register={register} errors={errors} /><div className="flex gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><ShieldCheck size={17} className="mt-0.5 shrink-0" /><span>After signup, open Profile to photograph both sides of your Australian driver licence. Booking remains locked until its details and expiry match your profile.</span></div></div>;

  const verifyContent = <div className="flex flex-col items-center px-1 pb-3 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-primary"><Mail size={23} /></div><p className="text-sm leading-6 text-muted">We sent a code to</p><p className="max-w-full truncate text-sm font-semibold text-ink">{verificationEmail}</p><input autoFocus inputMode="numeric" autoComplete="one-time-code" aria-label="Six-digit verification code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(event) => { if (event.key === "Enter") verifyEmail(); }} placeholder="000000" className="mt-6 w-full rounded-xl border border-hairline bg-white px-4 py-4 text-center text-2xl font-semibold tracking-[0.45em] text-ink outline-none transition placeholder:text-hairline focus:border-ink focus:ring-1 focus:ring-ink" />{previewCode && <p className="mt-3 rounded-lg bg-surface-soft px-3 py-2 text-xs text-muted">Local preview code: <strong className="text-ink">{previewCode}</strong></p>}<p className="mt-5 text-xs text-muted">Code expires in 10 minutes. Didn’t get it? <button type="button" disabled={isLoading} onClick={resendCode} className="font-semibold text-ink hover:underline disabled:opacity-50">Send a new code</button></p><button type="button" onClick={() => setStage("account")} className="mt-3 text-xs text-muted hover:text-ink hover:underline">Change signup details</button></div>;

  const successContent = <div className="flex flex-col items-center px-2 py-4 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check size={30} strokeWidth={2.5} /></div><h3 className="text-xl font-semibold text-ink">Account created</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted">Your email and profile details are saved. Add and check your Australian driver licence from Profile before requesting a booking.</p></div>;

  const footerContent = <div className="mx-5 mb-5 mt-0 flex flex-col gap-2 sm:mx-8"><div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hairline-soft" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-[11px] uppercase tracking-widest text-muted-soft">or</span></div></div><Button small outline label="Continue with Google" icon={FcGoogle} onClick={async () => { await signIn("google", { callbackUrl: "/profile" }); }} /><div className="text-center"><span className="text-sm text-muted">Already have an account? </span><button type="button" onClick={toggle} className="min-h-11 rounded-xs px-1 text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Log in</button></div></div>;

  const body = stage === "account" ? accountContent : stage === "profile" ? profileContent : stage === "about" ? aboutContent : stage === "verify" ? verifyContent : successContent;
  const title = stage === "account" ? "Create your account" : stage === "profile" ? "Tell us about you" : stage === "about" ? "Get road-ready" : stage === "verify" ? "Check your email" : "You’re all set";
  const actionLabel = stage === "account" || stage === "profile" ? "Continue" : stage === "about" ? "Create account" : stage === "verify" ? "Verify and finish" : "Explore Redrive";
  const submit = stage === "account" || stage === "profile" ? nextStep : stage === "about" ? handleSubmit(onSubmit) : stage === "verify" ? verifyEmail : continueAfterVerification;

  return <Modal disabled={isLoading} loading={isLoading} isOpen={registerModal.isOpen} title={title} actionLabel={actionLabel} onClose={registerModal.onClose} onSubmit={submit} body={body} footer={stage === "account" ? footerContent : undefined} secondaryAction={stage === "profile" || stage === "about" ? previousStep : undefined} secondaryActionLabel={stage === "profile" || stage === "about" ? "Back" : undefined} compact />;
};

function StepProgress({ current }: { current: number }) { return <div className="flex items-center gap-2" aria-label={`Signup step ${current} of 3`}>{[1, 2, 3].map((step) => <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${step <= current ? "bg-primary" : "bg-hairline-soft"}`} />)}</div>; }

function SignupJourney({ step }: { step: number }) {
  const copy = step === 1 ? "Create your Redrive identity" : step === 2 ? "Set your pickup-ready details" : "Build trust before your first trip";
  const Icon = step === 1 ? UserRound : step === 2 ? MapPin : Heart;
  return <div className="relative overflow-hidden rounded-md bg-graphite px-4 py-4 text-white"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><Icon size={18} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Step {step} of 3</p><p className="mt-0.5 text-sm font-semibold">{copy}</p></div></div><div className="signup-drive text-accent"><CarFront size={30} /></div></div><div className="signup-road mt-3 h-0.5 w-full opacity-60" /></div>;
}

export default RegisterModal;
