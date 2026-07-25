import { z } from "zod";
import type { components } from "./lead-contract";

const leadSchema = z
  .object({
    publicId: z.string().min(1),
    companyName: z.string().nullable(),
    website: z.string().nullable(),
    industry: z.string().nullable(),
    companySizeRange: z.string().min(1),
    country: z.string().nullable(),
    city: z.string().nullable(),
    source: z.string().min(1),
    status: z.string().min(1),
    lostReason: z.string().nullable(),
    isConverted: z.boolean(),
    numberOfAttempts: z.number().int().nonnegative(),
    lastAttemptAt: z.string().min(1),
    isArchived: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    deletedAt: z.string().nullable(),
  })
  .passthrough();

const contactSchema = z
  .object({
    publicId: z.string().min(1),
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    jobTitle: z.string().nullable(),
    isPrimary: z.boolean(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    deletedAt: z.string().nullable(),
  })
  .passthrough();

const activitySchema = z
  .object({
    publicId: z.string().min(1),
    type: z.string().min(1),
    note: z.string(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    deletedAt: z.string().nullable(),
  })
  .passthrough();

const pageMetaSchema = z.object({
  mode: z.literal("page"),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const eligibilitySchema = z.object({
  isEligible: z.boolean(),
  reasons: z.array(
    z.object({
      code: z.string().min(1),
      message: z.string().min(1),
    }),
  ),
  primaryContact: contactSchema.nullable(),
});

const leadWithContactsSchema = z.object({
  lead: leadSchema,
  contacts: z.array(contactSchema),
});

const leadDetailsSchema = leadWithContactsSchema.extend({
  activities: z.array(activitySchema),
  primaryContact: contactSchema.nullable(),
  conversionEligibility: eligibilitySchema,
});

const leadCreateResultSchema = leadWithContactsSchema.extend({
  meta: z.object({ duplicate: z.boolean() }),
});

const leadListResponseSchema = z.object({
  items: z.array(leadWithContactsSchema),
  meta: pageMetaSchema,
});

const activityListResponseSchema = z.object({
  items: z.array(activitySchema),
  meta: pageMetaSchema,
});

export function parseLeadDetails(value: unknown): components["schemas"]["LeadDetails"] {
  // The runtime schema intentionally accepts future enum strings so the UI can render a safe fallback.
  return leadDetailsSchema.parse(value) as components["schemas"]["LeadDetails"];
}

export function parseLeadCreateResult(value: unknown): components["schemas"]["LeadCreateResult"] {
  // The generated contract is narrower only for backend-owned enum strings validated above as nonblank.
  return leadCreateResultSchema.parse(value) as components["schemas"]["LeadCreateResult"];
}

export function parseLeadListResponse(value: unknown): components["schemas"]["LeadListResponse"] {
  // The generated contract is narrower only for backend-owned enum strings validated above as nonblank.
  return leadListResponseSchema.parse(value) as components["schemas"]["LeadListResponse"];
}

export function parseLeadActivityListResponse(
  value: unknown,
): components["schemas"]["LeadActivityListResponse"] {
  // The generated contract is narrower only for backend-owned enum strings validated above as nonblank.
  return activityListResponseSchema.parse(
    value,
  ) as components["schemas"]["LeadActivityListResponse"];
}

export function parseLeadConversionEligibility(
  value: unknown,
): components["schemas"]["LeadConversionEligibility"] {
  // The generated contract is narrower only for backend-owned reason-code strings validated above as nonblank.
  return eligibilitySchema.parse(value) as components["schemas"]["LeadConversionEligibility"];
}
