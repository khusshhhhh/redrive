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

import Heading from '../Heading';
import Input from '../inputs/Input';
import { toast } from 'react-hot-toast'
import Button from '../Button';
import { useRouter } from 'next/navigation';
import Modal from './Modal';

const LoginModal = () => {

    const registerModal = useRegisterModal();
    const router = useRouter();
    const loginModal = useLoginModal();
    const [isLoading, setIsLoading] = useState(false);

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
                        First time using Redrive?
                    </div>
                    <div onClick={toggle} className="text-neutral-800 cursor-pointer hover:underline">
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