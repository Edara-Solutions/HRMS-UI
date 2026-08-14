/**
 * Runtime half of the Company Audit Trail contract: it re-states the generated
 * `CompanyAuditTrailPage` as Zod so responses stay checked after TypeScript types are erased.
 * The return type of `parseCompanyAuditTrailPage` ties the two together — if the schemas drift
 * apart, the compiler fails before any test does.
 */

import { z } from "zod";
import type { components } from "@/shared/api";

export type CompanyAuditTrailPage = components["schemas"]["CompanyAuditTrailPage"];

// A Company reader learns that Edara acted, never which Platform Admin acted, so the
// PLATFORM_ADMIN member carries no identifier and `.strict()` rejects one that appears.
const actorSchema = z.union([
  z.object({ kind: z.literal("USER"), publicId: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("PLATFORM_ADMIN") }).strict(),
  z
    .object({
      kind: z.literal("SYSTEM"),
      component: z.enum(["EMAIL_WORKER", "SCHEDULER", "SCRIPT"]),
    })
    .strict(),
  z.object({ kind: z.literal("ANONYMOUS") }).strict(),
  z.object({ kind: z.literal("ATTRIBUTION_FAILED") }).strict(),
]);

const targetSchema = z
  .object({
    targetType: z.string(),
    publicId: z.string(),
  })
  .strict();

const availableEventFields = {
  eventVersion: z.literal(1),
  occurredAt: z.string().datetime(),
  outcome: z.enum(["SUCCESS", "FAILURE"]),
  actor: actorSchema,
  traceId: z.string().nullable(),
  targets: z.array(targetSchema),
};

const profileMaterialUpdatedEventSchema = z
  .object({
    ...availableEventFields,
    eventType: z.literal("company.profile.material_updated"),
    details: z
      .object({
        changes: z.array(
          z
            .object({
              field: z.enum(["name", "country", "taxNumber", "commercialNumber"]),
              before: z.string().nullable(),
              after: z.string().nullable(),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

const profileCompletedEventSchema = z
  .object({
    ...availableEventFields,
    eventType: z.literal("company.profile.completed"),
    details: z
      .object({
        beforeStatus: z.enum(["INCOMPLETE", "COMPLETE"]),
        afterStatus: z.literal("COMPLETE"),
      })
      .strict(),
  })
  .strict();

// Retained history the backend could not project — an unsupported event version or damaged
// data. It arrives as an honest placeholder instead of raw, unprojected event fields.
const unavailableEventSchema = z
  .object({
    eventType: z.literal("audit.event.unavailable"),
    eventVersion: z.literal(1),
    occurredAt: z.string().datetime(),
    reason: z.literal("UNSUPPORTED_OR_DAMAGED"),
  })
  .strict();

const companyPageSchema = z
  .object({
    items: z.array(
      z.discriminatedUnion("eventType", [
        profileMaterialUpdatedEventSchema,
        profileCompletedEventSchema,
        unavailableEventSchema,
      ]),
    ),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .strict();

export function parseCompanyAuditTrailPage(value: unknown): CompanyAuditTrailPage {
  return companyPageSchema.parse(value);
}
