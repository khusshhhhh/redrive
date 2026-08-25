import { z } from "zod";

import { isoDateSchema, mobileUserSchema, objectIdSchema } from "./common";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(8).max(128);
const strongPasswordSchema = passwordSchema
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a symbol");

export const mobilePlatformSchema = z.enum(["ios", "android"]);

export const deviceMetadataSchema = z.object({
  deviceId: z.string().trim().min(8).max(200),
  deviceName: z.string().trim().max(120).optional(),
  platform: mobilePlatformSchema,
  appVersion: z.string().trim().max(40).optional(),
});

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  name: z.string().trim().min(2).max(100),
  number: z.string().trim().min(8).max(30),
  dateOfBirth: z.string().trim().min(8).max(10),
  streetAddress: z.string().trim().min(2).max(180),
  suburb: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(30),
  postcode: z.string().trim().max(10).default(""),
  hobbies: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  dreamDestinations: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export const verifyEmailRequestSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
});

export const resendVerificationRequestSchema = z.object({ email: emailSchema });

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  device: deviceMetadataSchema,
});

export const verifyLoginOtpRequestSchema = z.object({
  challengeId: objectIdSchema,
  code: z.string().regex(/^\d{6}$/),
});

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(40).max(512),
});

export const logoutRequestSchema = z.object({
  refreshToken: z.string().min(40).max(512).optional(),
});

export const forgotPasswordRequestSchema = z.object({ email: emailSchema });

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(32).max(512),
  password: strongPasswordSchema,
});

export const profilePatchRequestSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  number: z.string().trim().max(30).optional(),
  dateOfBirth: z.string().trim().max(10).optional(),
  streetAddress: z.string().trim().max(180).optional(),
  suburb: z.string().trim().max(100).optional(),
  state: z.string().trim().max(30).optional(),
  postcode: z.string().trim().max(10).optional(),
  hobbies: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  dreamDestinations: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  image: z.string().trim().max(2048).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one profile change");

export const deleteAccountRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  confirmation: z.literal("DELETE"),
});

export const mobileSessionSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: isoDateSchema,
  refreshToken: z.string(),
  refreshTokenExpiresAt: isoDateSchema,
  sessionId: objectIdSchema,
  user: mobileUserSchema,
});

export const loginOtpChallengeSchema = z.object({
  code: z.literal("LOGIN_OTP_REQUIRED"),
  challengeId: objectIdSchema,
  expiresAt: isoDateSchema,
  previewCode: z.string().regex(/^\d{6}$/).optional(),
});

export type DeviceMetadata = z.infer<typeof deviceMetadataSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type MobileSessionResponse = z.infer<typeof mobileSessionSchema>;
