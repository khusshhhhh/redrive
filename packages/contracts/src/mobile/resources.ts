import { z } from "zod";

import { isoDateSchema, objectIdSchema, pageInfoSchema } from "./common";

export const listingsQuerySchema = z.object({
  cursor: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  state: z.string().trim().max(30).optional(),
  suburb: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  minPriceCents: z.coerce.number().int().nonnegative().optional(),
  maxPriceCents: z.coerce.number().int().nonnegative().optional(),
  guestCount: z.coerce.number().int().min(1).max(100).optional(),
});

export const publicListingSchema = z.object({
  id: objectIdSchema,
  title: z.string(),
  description: z.string(),
  company: z.string(),
  model: z.string(),
  category: z.string(),
  year: z.number().int(),
  imageUrls: z.array(z.string()),
  price: z.object({ amountCents: z.number().int(), currency: z.literal("AUD"), unit: z.literal("day") }),
  guestCount: z.number().int(),
  doorCount: z.number().int(),
  sleepCount: z.number().int(),
  fuelType: z.string(),
  driveChain: z.string(),
  amenities: z.array(z.string()),
  approximateLocation: z.object({ suburb: z.string(), state: z.string() }),
  isFavourite: z.boolean(),
  createdAt: isoDateSchema,
});

export type PublicListing = z.infer<typeof publicListingSchema>;

export const listingsPageSchema = z.object({
  data: z.array(publicListingSchema),
  page: pageInfoSchema,
});

export const savedSearchRequestSchema = z.object({
  name: z.string().trim().min(1).max(60),
  filters: z.record(z.string(), z.union([z.string().max(120), z.number().finite()])),
  alertFrequency: z.enum(["OFF", "DAILY", "WEEKLY"]).default("OFF"),
});

export const savedSearchPatchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  alertFrequency: z.enum(["OFF", "DAILY", "WEEKLY"]).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one change");

export const quoteRequestSchema = z.object({
  listingId: objectIdSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  insuranceType: z.enum(["No Insurance", "Risk Taker", "Happy Driver"]).default("No Insurance"),
});

export const reservationRequestSchema = quoteRequestSchema.extend({
  message: z.string().trim().max(1500).default(""),
});

export const reservationStatusRequestSchema = z.object({
  status: z.enum(["APPROVED", "DECLINED"]),
});

export const cancellationRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const availabilityBlockRequestSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  reason: z.string().trim().max(300).optional(),
});

export const messageRequestSchema = z.object({
  text: z.string().trim().max(4000).optional(),
  imageUrl: z.string().url().max(2048).optional(),
}).refine((value) => Boolean(value.text || value.imageUrl), "A message needs text or an image");

export const pushTokenRequestSchema = z.object({
  token: z.string().regex(/^ExponentPushToken\[[\w-]+\]$|^ExpoPushToken\[[\w-]+\]$/),
  deviceId: z.string().trim().min(8).max(200),
  platform: z.enum(["ios", "android"]),
  appEnvironment: z.enum(["development", "preview", "production"]),
});

export const paginationQuerySchema = z.object({
  cursor: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
