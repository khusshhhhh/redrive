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
import Heading from '../Heading';
import Input from '../inputs/Input';
import { toast } from 'react-hot-toast';
import Button from '../Button';
import { signIn } from 'next-auth/react';
import useLoginModal from '@/app/hooks/useLoginModal';
import Modal from './Modal';
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai"; // Added eye icons for show/hide password feature

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
        setShowPassword((prevState) => !prevState); // Function to toggle password visibility
    };

    const handleGoogleSignIn = async () => {
        await signIn('google', { callbackUrl: "/" }); // ✅ Redirects to home after Google sign-in
    };

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading title="" subtitle="Create an Account with Redrive." />

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
                    type={showPassword ? "text" : "password"} // Toggle input type based on state
                    label="Password"
                    errors={errors}
                    disabled={isLoading}
                    register={register}
                    required
                    validate={(value: string) => {
                        if (value.length < 8) return "Password must be at least 8 characters";
                        if (value.length > 16) return "Password must not exceed 16 characters";
                        if (!/[A-Z]/.test(value)) return "Must contain at least one uppercase letter";
                        if (!/\d/.test(value)) return "Must contain at least one number";
                        return true;
                    }}
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility} // Click to toggle visibility
                    className="absolute inset-y-0 right-4 flex items-center text-gray-500"
                >
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                </button>
            </div>

            <div className="text-sm text-gray-500">
                Password must contain:<br />
                • <b>8-16 characters</b><br />
                • At least <b>one uppercase letter</b><br />
                • At least <b>one number</b>.
            </div>
            {errors.password && <p className="text-red-500 text-sm">{errors.password?.message as string}</p>}

            {/* Confirm Password Field */}
            <div className='relative'>
                <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"} // Toggle input type based on state
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
                    onClick={togglePasswordVisibility} // Click to toggle visibility
                    className="absolute inset-y-0 right-4 flex items-center text-gray-500"
                >
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />}
                </button>
            </div>

            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword?.message as string}</p>}
        </div>
    );

    const footerContent = (
        <div className="flex flex-col gap-4 mt-3 mx-6">
            <hr />

            {/* ✅ Google Sign-In Button */}
            <Button
                outline
                label="Sign in with Google"
                icon={FcGoogle}
                onClick={handleGoogleSignIn}
            />

            <div className="text-neutral-500 text-center mt-4 font-light">
                <div className="justify-center flex flex-row items-center gap-4 mb-6">
                    <div>Already have an account?</div>
                    <div onClick={toggle} className="text-neutral-800 cursor-pointer hover:underline">
                        Log in to account
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Modal
            disabled={isLoading}
            isOpen={registerModal.isOpen}
            title="Welcome to Redrive!"
            actionLabel="Continue"
            onClose={registerModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            body={bodyContent}
            footer={footerContent}
        />
    );
}

export default RegisterModal;
