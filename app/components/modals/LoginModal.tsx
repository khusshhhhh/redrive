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
import useResetPasswordModal from '@/app/hooks/useResetPasswordModal';

import Heading from '../Heading';
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
    const resetPasswordModal = useResetPasswordModal();
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
        <div className="flex flex-col gap-4">
            <Heading title="" subtitle="Log in to continue." />
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
                    className="absolute inset-y-0 right-4 flex items-center text-gray-500"
                >
                    {showPassword ? <AiFillEyeInvisible size={20} /> : <AiFillEye size={20} />} {/* Toggle icons */}
                </button>
            </div>
            <div
                onClick={() => {
                    loginModal.onClose();
                    resetPasswordModal.onOpen();
                }}
                className="text-sm text-neutral-500 underline cursor-pointer"
            >
                Reset your password
            </div>
        </div>
    )

    const footerContent = (
        <div className="flex flex-col gap-4 mt-3 mx-6">
            <hr />
            <Button
                outline
                label="Continue with Google"
                icon={FcGoogle}
                onClick={async () => { await signIn('google'); }}
            />
            <div className="text-neutral-500 text-center mt-4 font-light">

                <div className="justify-center flex flex-row items-center gap-4 mb-6">
                    <div className='text-neutral-800 font-regular'>
                        First time using Redrive?
                    </div>
                    <div onClick={toggle} className="text-neutral-800 font-bold cursor-pointer hover:underline">
                        Create an account
                    </div>
                </div>
            </div>
        </div>
    );


    return (
        <Modal
            disabled={isLoading}
            isOpen={loginModal.isOpen}
            title="Welcome back to Redrive!"
            actionLabel="Continue"
            onClose={loginModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            body={bodyContent}
            footer={footerContent}
        />
    );

}

export default LoginModal;