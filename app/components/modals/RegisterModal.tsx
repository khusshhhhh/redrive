'use client';

import axios from 'axios';
import { FcGoogle } from "react-icons/fc";
import { useCallback, useState } from 'react';
import {
    FieldValues,
    SubmitHandler,
    useForm
} from 'react-hook-form';

import useRegisterModal from "@/app/hooks/useRegisterModal";
import Input from '../inputs/Input';
import { toast } from 'react-hot-toast';
import Button from '../Button';
import { signIn } from 'next-auth/react';
import useLoginModal from '@/app/hooks/useLoginModal';
import Modal from './Modal';
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { Check, Mail } from "lucide-react";

type RegisterStage = "details" | "verify" | "success";
const RegisterModal = () => {
    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [stage, setStage] = useState<RegisterStage>("details");
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationEmail, setVerificationEmail] = useState("");
    const [previewCode, setPreviewCode] = useState("");

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FieldValues>({
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
        mode: 'onChange',
    });

    // Watch password fields
    const password = watch("password");

    // Password validation helpers
    const getPasswordValidation = (password: string) => {
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
        };
    };

    const isPasswordValid = (password: string) => {
        const validation = getPasswordValidation(password);
        return validation.minLength && validation.hasUppercase && validation.hasLowercase && validation.hasSpecialChar;
    };

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        // Exclude confirmPassword from request
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { confirmPassword, ...formData } = data;

        axios.post('/api/register', formData, {
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => {
                setVerificationEmail(formData.email.trim().toLowerCase());
                setPreviewCode(response.data.previewCode || "");
                setStage("verify");
                toast.success("Verification code sent");
            })
            .catch((error) => {
                console.error("Registration error:", error);
                toast.error(error.response?.data?.error || "Unable to create account");
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const toggle = useCallback(() => {
        registerModal.onClose();
        loginModal.onOpen();
    }, [loginModal, registerModal]);

    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState);
    };

    const handleGoogleSignIn = async () => {
        await signIn('google', { callbackUrl: "/" });
    };

    const verifyEmail = async () => {
        if (verificationCode.length !== 6) {
            toast.error("Enter the six-digit code");
            return;
        }
        setIsLoading(true);
        try {
            await axios.post("/api/auth/verify-email", { email: verificationEmail, code: verificationCode });
            setStage("success");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Unable to verify email");
        } finally {
            setIsLoading(false);
        }
    };

    const resendCode = async () => {
        setIsLoading(true);
        try {
            const response = await axios.post("/api/auth/resend-verification", { email: verificationEmail });
            setPreviewCode(response.data.previewCode || "");
            setVerificationCode("");
            toast.success("A new code was sent");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Unable to resend code");
        } finally {
            setIsLoading(false);
        }
    };

    const continueAfterVerification = async () => {
        setIsLoading(true);
        const result = await signIn("credentials", {
            email: verificationEmail,
            password,
            redirect: false,
        });
        setIsLoading(false);
        if (result?.ok) {
            toast.success("Welcome to Redrive");
            registerModal.onClose();
            window.location.reload();
        } else {
            registerModal.onClose();
            loginModal.onOpen();
        }
    };

    // Validation rule component
    const ValidationRule = ({ isValid, text }: { isValid: boolean; text: string }) => (
        <div className={`flex items-center gap-2 text-sm ${isValid ? 'text-ink' : 'text-muted'}`}>
            <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-xs font-bold ${
                isValid
                    ? 'bg-ink border-ink text-white'
                    : 'bg-surface-soft border-hairline text-muted-soft'
            }`}>
                {isValid ? '✓' : '✕'}
            </span>
            <span className={isValid ? 'line-through' : ''}>{text}</span>
        </div>
    );

    const passwordValidation = password ? getPasswordValidation(password) : {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasSpecialChar: false
    };

    const bodyContent = (
        <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-muted mb-2">Create an account to book trips, save favourites and list your vehicle.</p>

            <Input
                id="email"
                label="Email"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />

            <Input
                id="name"
                label="Name"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />

            {/* Password Field */}
            <div className='relative'>
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    errors={errors}
                    disabled={isLoading}
                    register={register}
                    required
                    validate={(value: string) => {
                        if (!isPasswordValid(value)) {
                            return "Password must meet all requirements below";
                        }
                        return true;
                    }}
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-3 flex items-center rounded-full px-2 text-muted hover:text-ink"
                >
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                </button>
            </div>

            {/* Live Password Validation Feedback — only surfaces once the user starts typing,
                so the form doesn't open with a wall of requirements. */}
            {password && password.length > 0 && (
                <div className="rounded-lg bg-surface-soft px-3 py-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                        <ValidationRule
                            isValid={passwordValidation.minLength}
                            text="At least 8 characters"
                        />
                        <ValidationRule
                            isValid={passwordValidation.hasUppercase}
                            text="One uppercase letter (A-Z)"
                        />
                        <ValidationRule
                            isValid={passwordValidation.hasLowercase}
                            text="One lowercase letter (a-z)"
                        />
                        <ValidationRule
                            isValid={passwordValidation.hasSpecialChar}
                            text="One special character (!@#$%^&*)"
                        />
                    </div>
                </div>
            )}

            {errors.password && <p className="text-error text-sm">{errors.password?.message as string}</p>}

            {/* Confirm Password Field */}
            <div className='relative'>
                <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    label="Confirm Password"
                    disabled={isLoading}
                    register={register}
                    required
                    errors={errors}
                    validate={(value: string) =>
                        value === password || "Passwords do not match"
                    }
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-3 flex items-center rounded-full px-2 text-muted hover:text-ink"
                >
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                </button>
            </div>

            {errors.confirmPassword && <p className="text-error text-sm">{errors.confirmPassword?.message as string}</p>}
        </div>
    );

    const verifyContent = (
        <div className="flex flex-col items-center px-1 pb-3 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-primary"><Mail size={23} /></div>
            <p className="text-sm leading-6 text-muted">We sent a code to</p>
            <p className="max-w-full truncate text-sm font-semibold text-ink">{verificationEmail}</p>
            <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Six-digit verification code"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(event) => { if (event.key === "Enter") verifyEmail(); }}
                placeholder="000000"
                className="mt-6 w-full rounded-xl border border-hairline bg-white px-4 py-4 text-center text-2xl font-semibold tracking-[0.45em] text-ink outline-none transition placeholder:text-hairline focus:border-ink focus:ring-1 focus:ring-ink"
            />
            {previewCode && <p className="mt-3 rounded-lg bg-surface-soft px-3 py-2 text-xs text-muted">Local preview code: <strong className="text-ink">{previewCode}</strong></p>}
            <p className="mt-5 text-xs text-muted">Code expires in 10 minutes. Didn’t get it? <button type="button" disabled={isLoading} onClick={resendCode} className="font-semibold text-ink hover:underline disabled:opacity-50">Send a new code</button></p>
            <button type="button" onClick={() => setStage("details")} className="mt-3 text-xs text-muted hover:text-ink hover:underline">Change email</button>
        </div>
    );

    const successContent = (
        <div className="flex flex-col items-center px-2 py-4 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check size={30} strokeWidth={2.5} /></div>
            <h3 className="text-xl font-semibold text-ink">Email verified</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted">Your account is ready. Continue to start exploring Redrive.</p>
        </div>
    );

    const footerContent = (
        <div className="flex flex-col gap-3 mt-2 mx-5 sm:mx-7 mb-5">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-hairline-soft" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[11px] text-muted-soft uppercase tracking-widest">or</span>
                </div>
            </div>

            {/* Google Sign-In Button */}
            <Button
                outline
                label="Sign in with Google"
                icon={FcGoogle}
                onClick={handleGoogleSignIn}
            />

            <div className="text-center mt-1">
                <span className="text-muted text-sm">Already have an account? </span>
                <span onClick={toggle} className="text-ink text-sm font-semibold cursor-pointer hover:underline">
                    Log in
                </span>
            </div>
        </div>
    );

    return (
        <Modal
            disabled={isLoading}
            loading={isLoading}
            isOpen={registerModal.isOpen}
            title={stage === "details" ? "Create your account" : stage === "verify" ? "Check your email" : "You’re all set"}
            actionLabel={stage === "details" ? "Create account" : stage === "verify" ? "Verify email" : "Continue to Redrive"}
            onClose={registerModal.onClose}
            onSubmit={stage === "details" ? handleSubmit(onSubmit) : stage === "verify" ? verifyEmail : continueAfterVerification}
            body={stage === "details" ? bodyContent : stage === "verify" ? verifyContent : successContent}
            footer={stage === "details" ? footerContent : undefined}
            compact
        />
    );
}

export default RegisterModal;
