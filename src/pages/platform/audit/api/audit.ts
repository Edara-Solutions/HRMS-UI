import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import type { AuditTrailFilters } from "@/features/audit-filters";
import {
  platformCommunicationsOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  usePlatformAccess,
} from "@/shared/api";

type AuditTrailQuery = z.input<(typeof operations.auditTrail)["requestSchema"]>["query"];
export type PlatformAuditTrailPage = z.output<(typeof operations.auditTrail)["responses"]["200"]>;
export type PlatformAuditTrailItem = PlatformAuditTrailPage["items"][number];

/** Recording binding as declared by the generated contract (TRANSACTIONAL | STANDALONE). */
export type AuditRecordingBinding = Extract<
  PlatformAuditTrailItem,
  { eventType: "audit.trail.platform_read" }
>["recordingBinding"];

/** Every event type the Platform trail admits, straight from its generated request contract. */
export type PlatformAuditEventType = NonNullable<AuditTrailQuery["eventType"]>[number];

const eventTypeSchema =
  operations.auditTrail.requestSchema.shape.query.shape.eventType.unwrap().element;

export const platformAuditEventTypes: readonly PlatformAuditEventType[] = [
  ...new Set(eventTypeSchema.options.map((option) => option.value)),
];

/** Whether a URL value names an event type the Platform operation declares. */
export function isPlatformEventType(value: string): value is PlatformAuditEventType {
  return platformAuditEventTypes.some((eventType) => eventType === value);
}

/** Scope filter for the Platform audit trail. */
export type PlatformAuditTrailScope = "PLATFORM" | "COMPANY";

/**
 * Filter and paging inputs for the Platform Audit Trail.
 * Extends the shared filter set with Platform-specific filters: companyPublicId, scope, traceId.
 */
export interface PlatformAuditTrailParams extends Omit<AuditTrailFilters, "eventType"> {
  cursor?: string;
  limit?: number;
  companyPublicId?: string;
  scope?: PlatformAuditTrailScope;
  traceId?: string;
  view?: "table" | "timeline";
  lens?: "chronological" | "person" | "entity";
  eventType?: string[];
}

/** Only declared event types reach the request; anything else would be a request violation. */
export function toQuery(params: PlatformAuditTrailParams): AuditTrailQuery {
  const eventType = params.eventType?.filter(isPlatformEventType);
  return {
    cursor: params.cursor,
    limit: params.limit,
    occurredFrom: params.occurredFrom,
    occurredTo: params.occurredTo,
    actorPublicId: params.actorPublicId,
    outcome: params.outcome,
    eventType: eventType && eventType.length > 0 ? eventType : undefined,
    companyPublicId: params.companyPublicId,
    traceId: params.traceId,
    scope: params.scope,
  };
}

export function usePlatformAuditTrail(params: PlatformAuditTrailParams = {}) {
  const access = usePlatformAccess();
  const query = toQuery(params);
  return useQuery({
    queryKey: platformQueryKey(
      access.user?.publicId ?? "",
      operations.auditTrail,
      JSON.stringify(query),
    ),
    queryFn: ({ signal }) => requestPlatformOperation(operations.auditTrail, { query }, signal),
    enabled: access.availability(operations.auditTrail.key).state === "enabled",
    retry: false,
  });
}

export type { AuditTrailFilters };
