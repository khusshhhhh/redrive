"use client";

import { useCallback, useState } from "react";
import { signIn } from "next-auth/react";
import { useForm, type FieldValues, type SubmitHandler } from "react-hook-form";
import GoogleIcon from "../icons/GoogleIcon";
import { ArrowLeft, CarFront, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { toast } from "@/app/libs/toast";
import { useRouter } from "next/navigation";

import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import Input from "../inputs/Input";
import PasswordField from "../inputs/PasswordField";
import Button from "../Button";
import AuthShell, { type RailPoint } from "./AuthShell";
import { recordBrowserActivity } from "@/app/libs/browserSessionActivity";
import { notifyAuthChanged } from "@/app/providers/CurrentUserProvider";

type LoginStage = "credentials" | "otp";

const RAIL_POINTS: RailPoint[] = [
  { icon: <CarFront size={14} />, text: "Pick up trips, messages and your hosted vehicles where you left off." },
  { icon: <KeyRound size={14} />, text: "Optional login codes add a second check on every sign-in." },
  { icon: <ShieldCheck size={14} />, text: "Your details are held securely and never shared with hosts." },
];

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
    // A successful sign-in starts a new inactivity window. Do this before the
    // route refresh mounts the authenticated session guard so an old browser
    // timestamp can never be applied to the new session.
    recordBrowserActivity(window.localStorage);
    toast.success("Welcome back");
    notifyAuthChanged();
    const redirectTo = loginModal.consumeRedirect();
    if (redirectTo) router.push(redirectTo);
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
    <div className="space-y-4">
      <Input id="email" type="email" label="Email address" disabled={isLoading} register={register} errors={errors} required />
      <PasswordField id="password" label="Password" autoComplete="current-password" disabled={isLoading} register={register} errors={errors} />
      <div className="flex items-center gap-2.5 rounded-md bg-surface-soft px-3 py-2.5 text-xs leading-5 text-muted">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-primary">
          <KeyRound size={14} />
        </span>
        If you use login verification, we&rsquo;ll ask for a code next.
      </div>
    </div>
  );

  const otpBody = (
    <div className="flex flex-col items-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-soft text-primary">
        <Mail size={24} />
      </div>
      <p className="text-sm leading-6 text-muted">Enter the code sent to</p>
      <p className="max-w-full truncate text-sm font-semibold text-ink">{credentials.email}</p>
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Six-digit login code"
        value={otp}
        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(event) => {
          if (event.key === "Enter") submitOtp();
        }}
        placeholder="000000"
        className="mt-6 h-16 w-full rounded-md border border-hairline bg-white px-4 text-center text-2xl font-semibold tracking-[0.42em] text-ink outline-none transition placeholder:text-hairline focus:border-ink focus:ring-1 focus:ring-ink"
      />
      {previewCode && (
        <p className="mt-3 rounded-sm bg-surface-soft px-3 py-2 text-xs text-muted">
          Local preview code: <strong className="text-ink">{previewCode}</strong>
        </p>
      )}
      <p className="mt-5 text-xs leading-5 text-muted">
        The code expires in 10 minutes.{" "}
        <button
          type="button"
          disabled={isLoading}
          onClick={resendOtp}
          className="font-semibold text-ink hover:underline disabled:opacity-50"
        >
          Send another code
        </button>
      </p>
      <button
        type="button"
        onClick={() => {
          setStage("credentials");
          setOtp("");
        }}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={14} /> Use another account
      </button>
    </div>
  );

  const belowAction = stage === "credentials" ? (
    <div className="mt-3 flex flex-col gap-2">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-hairline-soft" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-[11px] uppercase tracking-widest text-muted-soft">or</span>
        </div>
      </div>
      <Button
        small
        outline
        label="Continue with Google"
        icon={GoogleIcon}
        onClick={async () => {
          await signIn("google", { callbackUrl: loginModal.redirectTo || undefined });
        }}
      />
      <p className="text-center text-sm text-muted">
        New to Redrive?{" "}
        <button
          type="button"
          onClick={toggle}
          className="rounded-xs px-1 font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Create an account
        </button>
      </p>
    </div>
  ) : undefined;

  return (
    <AuthShell
      isOpen={loginModal.isOpen}
      onClose={loginModal.onClose}
      onSubmit={stage === "credentials" ? handleSubmit(submitCredentials) : submitOtp}
      disabled={isLoading}
      loading={isLoading}
      title={stage === "credentials" ? "Welcome back" : "Check your email"}
      subtitle={
        stage === "credentials"
          ? "Log in to access your trips, messages and hosted vehicles."
          : undefined
      }
      actionLabel={stage === "credentials" ? "Log in" : "Verify and log in"}
      railHeadline="Welcome back to Redrive — the marketplace for useful vehicles."
      railPoints={RAIL_POINTS}
      belowAction={belowAction}
    >
      {stage === "credentials" ? credentialBody : otpBody}
    </AuthShell>
  );
};

export default LoginModal;
