'use client';

import axios from 'axios';
// import { AiFillGithub } from "react-icons/ai";
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
import { toast } from 'react-hot-toast'
import Button from '../Button';
import { signIn } from 'next-auth/react'
import useLoginModal from '@/app/hooks/useLoginModal';
import Modal from './Modal';

const RegisterModal = () => {

    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FieldValues>({
        defaultValues: {
            name: '',
            email: '',
            password: '',
        },
    });

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.post('/api/register', data, {
            headers: {
                "Content-Type": "application/json", // ✅ Ensure JSON format
            },
        })
            .then(() => {
                toast.success("Success!")
                registerModal.onClose();
                loginModal.onOpen();
                toast.success("Registration successful!");
            })
            .catch((error) => {
                console.error("Registration error:", error); // ✅ Log error for debugging
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

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading title="" subtitle="Create an Account with Redrive." />
            <Input
                id="email"
                label="Email"
                disabled={isLoading}
                register={register}
                errors={errors}
                required />
            <Input
                id="name"
                label="Name"
                disabled={isLoading}
                register={register}
                errors={errors}
                required />
            <Input
                id="password"
                type="password"
                label="Password"
                disabled={isLoading}
                register={register}
                errors={errors}
                required />
        </div>
    )

    const footerContent = (
        <div className="flex flex-col gap-4 mt-3 mr-8">
            <hr />
            <Button
                outline
                label="Continue with Google"
                icon={FcGoogle}
                onClick={() => signIn('google')}
            />
            <div className="text-neutral-500 text-center mt-4 font-light">

                <div className="justify-center flex flex-row items-center gap-4 mb-6">
                    <div>
                        Already have an account?
                    </div>
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