import { z } from "zod";

import { objectIdSchema, isoDateSchema } from "../mobile/common";

// Shared request/response contracts for the web (Next.js) API routes. Same
// intent as the mobile contracts: one schema, imported by both the route (to
// parse the request at runtime) and the tests (to assert the response shape),
// so the two cannot drift.

export const reviewResponseRequestSchema = z.object({
  reviewId: objectIdSchema,
  response: z.string().trim().min(3).max(1500),
});
export type ReviewResponseRequest = z.infer<typeof reviewResponseRequestSchema>;

export const reviewResponseResultSchema = z.object({
  id: objectIdSchema,
  response: z.string().nullable(),
  respondedAt: isoDateSchema.nullable(),
});
export type ReviewResponseResult = z.infer<typeof reviewResponseResultSchema>;

export const SAVED_SEARCH_FREQUENCIES = ["OFF", "DAILY", "WEEKLY"] as const;

export const savedSearchCreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(60),
  filters: z.record(
    z.string(),
    z.union([z.string().max(120), z.number().finite(), z.boolean()]),
  ),
  alertFrequency: z.enum(SAVED_SEARCH_FREQUENCIES).default("OFF"),
});
export type SavedSearchCreateRequest = z.infer<typeof savedSearchCreateRequestSchema>;

export const savedSearchResultSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  filters: z.unknown(),
  alertFrequency: z.enum(SAVED_SEARCH_FREQUENCIES),
  active: z.boolean(),
  lastNotifiedAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type SavedSearchResult = z.infer<typeof savedSearchResultSchema>;
