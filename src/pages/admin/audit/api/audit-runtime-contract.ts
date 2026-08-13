import { z } from "zod";
import type { components } from "@/shared/api";

export type PlatformAuditTrailPage = components["schemas"]["PlatformAuditTrailPage"];

const actorSchema = z.union([
  z.object({ kind: z.literal("USER"), publicId: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("PLATFORM_ADMIN"), publicId: z.string().uuid() }).strict(),
  z
    .object({
      kind: z.literal("SYSTEM"),
      component: z.enum(["EMAIL_WORKER", "SCHEDULER", "SCRIPT"]),
    })
    .strict(),
  z.object({ kind: z.literal("ANONYMOUS") }).strict(),
  z.object({ kind: z.literal("ATTRIBUTION_FAILED") }).strict(),
]);

const originSchema = z
  .object({
    ip: z.string().nullable(),
    userAgent: z.string().nullable(),
  })
  .strict();

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
  origin: originSchema,
  targets: z.array(targetSchema),
};

const platformReadEventSchema = z
  .object({
    ...availableEventFields,
    eventType: z.literal("audit.trail.platform_read"),
    scope: z.literal("PLATFORM"),
    companyPublicId: z.null(),
    details: z
      .object({
        companyPublicId: z.string().nullable(),
        scope: z.enum(["PLATFORM", "COMPANY"]).nullable(),
      })
      .strict(),
  })
  .strict();

const profileMaterialUpdatedEventSchema = z
  .object({
    ...availableEventFields,
    eventType: z.literal("company.profile.material_updated"),
    scope: z.literal("COMPANY"),
    companyPublicId: z.string().uuid(),
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
    scope: z.literal("COMPANY"),
    companyPublicId: z.string().uuid(),
    details: z
      .object({
        beforeStatus: z.enum(["INCOMPLETE", "COMPLETE"]),
        afterStatus: z.literal("COMPLETE"),
      })
      .strict(),
  })
  .strict();

const unavailableEventSchema = z
  .object({
    eventType: z.literal("audit.event.unavailable"),
    eventVersion: z.literal(1),
    occurredAt: z.string().datetime(),
    reason: z.literal("UNSUPPORTED_OR_DAMAGED"),
  })
  .strict();

const platformPageSchema = z
  .object({
    items: z.array(
      z.discriminatedUnion("eventType", [
        platformReadEventSchema,
        profileMaterialUpdatedEventSchema,
        profileCompletedEventSchema,
        unavailableEventSchema,
      ]),
    ),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .strict();

export function parsePlatformAuditTrailPage(value: unknown): PlatformAuditTrailPage {
  return platformPageSchema.parse(value);
}
