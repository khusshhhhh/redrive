'use client';

import { signIn } from 'next-auth/react';
import { FcGoogle } from "react-icons/fc";
import { useCallback, useState } from 'react';
import {
    FieldValues,
    SubmitHandler,
    useForm
} from 'react-hook-form';

import useRegisterModal from "@/app/hooks/useRegisterModal";
import useLoginModal from '@/app/hooks/useLoginModal';

import Input from '../inputs/Input';
import { toast } from 'react-hot-toast'
import Button from '../Button';
import { useRouter } from 'next/navigation';
import Modal from './Modal';
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai"; // Added eye icons for show/hide password feature

const LoginModal = () => {

    const registerModal = useRegisterModal();
    const router = useRouter();
    const loginModal = useLoginModal();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FieldValues>({
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        signIn('credentials', {
            ...data,
            redirect: false,
        })
            .then((callback) => {
                setIsLoading(false);

                if (callback?.ok) {
                    toast.success('Logged in');
                    router.refresh();
                    loginModal.onClose();
                }

                if (callback?.error) {
                    toast.error(callback.error);
                }
            });

    }

    const toggle = useCallback(() => {
        loginModal.onClose();
        registerModal.onOpen();
    }, [loginModal, registerModal]);

    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState); // Function to toggle password visibility
    }

    const bodyContent = (
        <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-muted mb-2">Welcome back. Log in to manage your trips and vehicles.</p>
            <Input
                id="email"
                label="Email"
                disabled={isLoading}
                register={register}
                errors={errors}
                required />
            <div className="relative"> {/* Wrapped input inside a div for proper positioning */}
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"} // Toggle input type based on state
                    label="Password"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility} // Click to toggle visibility
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-3 flex items-center rounded-full px-2 text-muted hover:text-ink"
                >
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />} {/* Toggle icons */}
                </button>
            </div>
        </div>
    )

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
            <Button
                outline
                label="Continue with Google"
                icon={FcGoogle}
                onClick={async () => { await signIn('google'); }}
            />
            <div className="text-center mt-1">
                <span className="text-muted text-sm">First time using Redrive? </span>
                <span onClick={toggle} className="text-ink text-sm font-semibold cursor-pointer hover:underline">
                    Create an account
                </span>
            </div>
        </div>
    );


    return (
        <Modal
            disabled={isLoading}
            loading={isLoading}
            isOpen={loginModal.isOpen}
            title="Log in"
            actionLabel="Continue"
            onClose={loginModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            body={bodyContent}
            footer={footerContent}
            compact
        />
    );

}

export default LoginModal;
