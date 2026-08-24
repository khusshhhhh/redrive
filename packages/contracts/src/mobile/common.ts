import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
export const isoDateSchema = z.string().datetime({ offset: true });
export const requestIdSchema = z.string().min(8).max(160);

export const mobileFieldErrorsSchema = z.record(z.string(), z.string().max(240));

export const mobileErrorSchema = z.object({
  error: z.object({
    code: z.string().min(2).max(80),
    message: z.string().min(1).max(500),
    requestId: requestIdSchema,
    fields: mobileFieldErrorsSchema.optional(),
  }),
});

export type MobileErrorEnvelope = z.infer<typeof mobileErrorSchema>;

export const pageInfoSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type PageInfo = z.infer<typeof pageInfoSchema>;

export const mobileUserSchema = z.object({
  id: objectIdSchema,
  email: z.string().email(),
  name: z.string(),
  emailVerified: isoDateSchema.nullable(),
  image: z.string().nullable(),
  number: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  suburb: z.string().nullable(),
  state: z.string().nullable(),
  postcode: z.string().nullable(),
  hobbies: z.array(z.string()),
  dreamDestinations: z.array(z.string()),
  profileVerified: z.string().nullable(),
  licenseStatus: z.string(),
  licenseExpiresAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type MobileUser = z.infer<typeof mobileUserSchema>;
