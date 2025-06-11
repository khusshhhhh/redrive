'use client';

import axios from 'axios';
import { useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import Modal from './Modal';
import Heading from '../Heading';
import Input from '../inputs/Input';
import Button from '../Button';
import useResetPasswordModal from '@/app/hooks/useResetPasswordModal';
import { toast } from 'react-hot-toast';

const ResetPasswordModal = () => {
  const resetModal = useResetPasswordModal();
  const [step, setStep] = useState(1); // 1 email, 2 otp, 3 new password
  const [isLoading, setIsLoading] = useState(false);

  const { register, watch, formState: { errors }, setValue } = useForm<FieldValues>({
    defaultValues: {
      email: '',
      otp: '',
      password: '',
      confirmPassword: '',
    }
  });

  const email = watch('email');
  const otp = watch('otp');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const handleGetOtp = async () => {
    setIsLoading(true);
    try {
      await axios.post('/api/password/reset/request', { email });
      toast.success('OTP sent');
      setStep(2);
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      await axios.post('/api/password/reset/verify', { email, otp });
      toast.success('OTP verified');
      setStep(3);
    } catch (error) {
      toast.error('Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await axios.post('/api/password/reset/update', { email, otp, password });
      toast.success('Password updated');
      resetModal.onClose();
      setStep(1);
      setValue('otp', '');
      setValue('password', '');
      setValue('confirmPassword', '');
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  let bodyContent;

  if (step === 1) {
    bodyContent = (
      <div className="flex flex-col gap-4">
        <Heading title="" subtitle="Enter your account email" />
        <Input
          id="email"
          label="Email"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
    );
  } else if (step === 2) {
    bodyContent = (
      <div className="flex flex-col gap-4">
        <Heading title="" subtitle="Enter the OTP sent to your email" />
        <Input
          id="otp"
          label="OTP"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
    );
  } else {
    bodyContent = (
      <div className="flex flex-col gap-4">
        <Heading title="" subtitle="Set your new password" />
        <Input
          id="password"
          type="password"
          label="New Password"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
    );
  }

  const actionLabel = step === 1 ? 'Get OTP' : step === 2 ? 'Verify OTP' : 'Reset Password';
  const onSubmit = step === 1 ? handleGetOtp : step === 2 ? handleVerifyOtp : handleResetPassword;

  return (
    <Modal
      disabled={isLoading}
      isOpen={resetModal.isOpen}
      title="Reset Password"
      actionLabel={actionLabel}
      onClose={() => {
        resetModal.onClose();
        setStep(1);
      }}
      onSubmit={onSubmit}
      body={bodyContent}
    />
  );
};

export default ResetPasswordModal;
