import { z } from "zod";
import type { components } from "@/shared/api";

export type PlatformAuditTrailPage = components["schemas"]["PlatformAuditTrailPage"];

const platformActorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("USER"), publicId: z.string().uuid() }),
  z.object({ kind: z.literal("PLATFORM_ADMIN"), publicId: z.string().uuid() }),
  z.object({
    kind: z.literal("SYSTEM"),
    component: z.enum(["EMAIL_WORKER", "SCHEDULER", "SCRIPT"]),
  }),
  z.object({ kind: z.literal("ANONYMO") }),
  z.object({ kind: z.literal("ATTRIBUTION_FAILED") }),
]);

const originSchema = z.object({
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
});

const targetSchema = z.object({
  targetType: z.string(),
  publicId: z.string(),
});

const unavailableEventSchema = z.object({
  eventType: z.literal("audit.event.unavailable"),
  eventVersion: z.literal(1),
  occurredAt: z.string(),
  reason: z.literal("UNSUPPORTED_OR_DAMAGED"),
});

const PLATFORM_EVENT_TYPES = [
  "audit.trail.platform_read",
  "company.profile.material_updated",
  "company.profile.completed",
] as const;

const availableEventSchema = z.object({
  eventType: z.enum(PLATFORM_EVENT_TYPES),
  eventVersion: z.number(),
  occurredAt: z.string(),
  scope: z.enum(["PLATFORM", "COMPANY"]),
  companyPublicId: z.string().nullable(),
  outcome: z.enum(["SUCCESS", "FAILURE"]),
  actor: platformActorSchema,
  traceId: z.string().nullable(),
  origin: originSchema,
  targets: z.array(targetSchema),
  details: z.record(z.string(), z.unknown()),
});

const platformItemSchema = z.union([availableEventSchema, unavailableEventSchema]);

const platformPageSchema = z.object({
  items: z.array(platformItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export function parsePlatformAuditTrailPage(value: unknown): PlatformAuditTrailPage {
  return platformPageSchema.parse(value) as PlatformAuditTrailPage;
}