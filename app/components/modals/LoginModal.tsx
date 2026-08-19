"use client";

import { useCallback, useState } from "react";
import { signIn } from "next-auth/react";
import { useForm, type FieldValues, type SubmitHandler } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { ArrowLeft, CarFront, KeyRound, Mail } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import Input from "../inputs/Input";
import PasswordField from "../inputs/PasswordField";
import Button from "../Button";
import Modal from "./Modal";

type LoginStage = "credentials" | "otp";

const LoginModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<LoginStage>("credentials");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [previewCode, setPreviewCode] = useState("");

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FieldValues>({
    defaultValues: { email: "", password: "" },
  });

  const finishLogin = () => {
    toast.success("Welcome back");
    router.refresh();
    loginModal.onClose();
    setStage("credentials");
    setOtp("");
    reset();
  };

  const submitCredentials: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    const normalized = { email: data.email.trim().toLowerCase(), password: data.password };
    const result = await signIn("credentials", { ...normalized, redirect: false });
    setIsLoading(false);

    if (result?.ok) return finishLogin();
    if (result?.error?.includes("LOGIN_OTP_REQUIRED")) {
      setPreviewCode(result.error.split("LOGIN_OTP_REQUIRED:")[1] || "");
      setCredentials(normalized);
      setStage("otp");
      toast.success("Login code sent to your email");
      return;
    }
    toast.error(result?.error || "Email or password is incorrect");
  };

  const submitOtp = async () => {
    if (otp.length !== 6) return toast.error("Enter the six-digit code");
    setIsLoading(true);
    const result = await signIn("credentials", { ...credentials, otp, redirect: false });
    setIsLoading(false);

    if (result?.ok) return finishLogin();
    if (result?.error?.includes("LOGIN_OTP_EXPIRED")) return toast.error("This code expired. Send a new one.");
    if (result?.error?.includes("LOGIN_OTP_LOCKED")) return toast.error("Too many attempts. Send a new code.");
    if (result?.error?.includes("LOGIN_OTP_INVALID")) return toast.error("That code is not correct");
    toast.error(result?.error || "Unable to complete login");
  };

  const resendOtp = async () => {
    setIsLoading(true);
    const result = await signIn("credentials", { ...credentials, redirect: false });
    setIsLoading(false);
    if (result?.error?.includes("LOGIN_OTP_REQUIRED")) {
      setOtp("");
      setPreviewCode(result.error.split("LOGIN_OTP_REQUIRED:")[1] || previewCode);
      toast.success("Use the latest code in your inbox");
    } else {
      toast.error(result?.error || "Unable to send another code");
    }
  };

  const toggle = useCallback(() => {
    loginModal.onClose();
    registerModal.onOpen();
  }, [loginModal, registerModal]);

  const credentialBody = (
    <div className="space-y-6">
      <LoginJourney />
      <div className="text-center">
        <p className="text-sm leading-6 text-muted">Access your trips, messages and hosted vehicles.</p>
      </div>
      <div className="space-y-4">
        <Input id="email" type="email" label="Email address" disabled={isLoading} register={register} errors={errors} required />
        <PasswordField id="password" label="Password" autoComplete="current-password" disabled={isLoading} register={register} errors={errors} />
      </div>
      <div className="flex items-center gap-2 text-xs leading-5 text-muted">
        <KeyRound size={15} className="shrink-0" />
        If login verification is enabled, we’ll ask for a code after checking your password.
      </div>
    </div>
  );

  const otpBody = (
    <div className="flex flex-col items-center pb-3 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-soft text-primary"><Mail size={24} /></div>
      <p className="text-sm leading-6 text-muted">Enter the code sent to</p>
      <p className="max-w-full truncate text-sm font-semibold text-ink">{credentials.email}</p>
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Six-digit login code"
        value={otp}
        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(event) => { if (event.key === "Enter") submitOtp(); }}
        placeholder="000000"
        className="mt-7 h-16 w-full rounded-md border border-hairline bg-white px-4 text-center text-2xl font-semibold tracking-[0.42em] text-ink outline-none transition placeholder:text-hairline focus:border-ink focus:ring-1 focus:ring-ink"
      />
      {previewCode && <p className="mt-3 rounded-sm bg-surface-soft px-3 py-2 text-xs text-muted">Local preview code: <strong className="text-ink">{previewCode}</strong></p>}
      <p className="mt-5 text-xs leading-5 text-muted">The code expires in 10 minutes. <button type="button" disabled={isLoading} onClick={resendOtp} className="font-semibold text-ink hover:underline disabled:opacity-50">Send another code</button></p>
      <button type="button" onClick={() => { setStage("credentials"); setOtp(""); }} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"><ArrowLeft size={14} /> Use another account</button>
    </div>
  );

  const footer = stage === "credentials" ? (
    <div className="mx-6 mb-7 mt-3 flex flex-col gap-4 sm:mx-10">
      <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hairline-soft" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-[11px] uppercase tracking-widest text-muted-soft">or</span></div></div>
      <Button outline label="Continue with Google" icon={FcGoogle} onClick={async () => { await signIn("google"); }} />
      <p className="text-center text-sm text-muted">New to Redrive? <button type="button" onClick={toggle} className="font-semibold text-ink hover:underline">Create an account</button></p>
    </div>
  ) : undefined;

  return (
    <Modal
      compact
      disabled={isLoading}
      loading={isLoading}
      isOpen={loginModal.isOpen}
      title={stage === "credentials" ? "Welcome back" : "Check your email"}
      actionLabel={stage === "credentials" ? "Log in" : "Verify and log in"}
      onClose={loginModal.onClose}
      onSubmit={stage === "credentials" ? handleSubmit(submitCredentials) : submitOtp}
      body={stage === "credentials" ? credentialBody : otpBody}
      footer={footer}
    />
  );
};

function LoginJourney() {
  return (
    <div className="relative overflow-hidden rounded-md bg-ink px-5 py-4 text-white">
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
            Welcome back to
          </p>
          <div className="mt-1 flex items-end gap-0.5" role="img" aria-label="Redrive">
            <span
              aria-hidden="true"
              data-wordmark="redrive"
              className="login-wordmark text-2xl font-bold tracking-[-0.045em]"
            >
              redrive
            </span>
            <span aria-hidden="true" className="mb-0.5 text-xl font-bold leading-none text-accent">.</span>
          </div>
        </div>
        <div className="signup-drive text-accent" aria-hidden="true">
          <CarFront size={30} strokeWidth={1.8} />
        </div>
      </div>
      <div className="signup-road mt-3 h-0.5 w-full opacity-60" aria-hidden="true" />
    </div>
  );
}

export default LoginModal;
