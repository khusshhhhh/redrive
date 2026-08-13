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
const RegisterModal = () => {
    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
            .then(() => {
                toast.success("Success! Account created.");
                registerModal.onClose();
                loginModal.onOpen();
            })
            .catch((error) => {
                console.error("Registration error:", error);
                toast.error("Something went wrong!");
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
            <p className="text-body-sm text-muted mb-1">Create your Redrive account.</p>

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
                    className="absolute inset-y-0 right-4 flex items-center text-muted hover:text-ink"
                >
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                </button>
            </div>

            {/* Live Password Validation Feedback — only surfaces once the user starts typing,
                so the form doesn't open with a wall of requirements. */}
            {password && password.length > 0 && (
                <div className="bg-surface-soft p-4 rounded-sm">
                    <div className="space-y-2">
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
                    className="absolute inset-y-0 right-4 flex items-center text-muted hover:text-ink"
                >
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                </button>
            </div>

            {errors.confirmPassword && <p className="text-error text-sm">{errors.confirmPassword?.message as string}</p>}
        </div>
    );

    const footerContent = (
        <div className="flex flex-col gap-4 mt-2 mx-6 mb-4">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-hairline-soft" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-muted-soft uppercase tracking-wide">or</span>
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
            title="Sign up"
            actionLabel="Continue"
            onClose={registerModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            body={bodyContent}
            footer={footerContent}
        />
    );
}

export default RegisterModal;
