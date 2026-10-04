import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import type { AuditTrailFilters } from "@/features/audit-filters";
import {
  companyQueryKey,
  companyCommunicationsOperations as operations,
  requestCompanyOperation,
  useCompanyAccess,
} from "@/shared/api";

type AuditTrailQuery = z.input<(typeof operations)["auditTrail"]["requestSchema"]>["query"];
export type CompanyAuditTrailPage = z.output<(typeof operations)["auditTrail"]["responses"]["200"]>;
export type CompanyAuditTrailItem = CompanyAuditTrailPage["items"][number];
export type CompanyAuditEventType = NonNullable<AuditTrailQuery["eventType"]>[number];

/**
 * Filter and paging inputs for the Company Audit Trail. The Company route derives its scope
 * from the authenticated identity, so there is deliberately no Company or scope filter.
 */
export interface CompanyAuditTrailParams extends AuditTrailFilters {
  cursor?: string;
  limit?: number;
}

const eventTypeSchema =
  operations.auditTrail.requestSchema.shape.query.shape.eventType.unwrap().element;

/**
 * Every event type the Company trail admits, straight from its generated request contract. A
 * Platform-only type is absent because the Company operation declares no literal for it.
 */
export const companyAuditEventTypes: readonly CompanyAuditEventType[] = [
  ...new Set(eventTypeSchema.options.map((option) => option.value)),
];

/** Whether a URL value names an event type the Company operation declares. */
export function isCompanyEventType(value: string): value is CompanyAuditEventType {
  return companyAuditEventTypes.some((eventType) => eventType === value);
}

/** Only declared event types reach the request; anything else would be a request violation. */
function toQuery(params: CompanyAuditTrailParams): AuditTrailQuery {
  const eventType = params.eventType?.filter((value) => isCompanyEventType(value));
  return {
    cursor: params.cursor,
    limit: params.limit,
    occurredFrom: params.occurredFrom,
    occurredTo: params.occurredTo,
    actorPublicId: params.actorPublicId,
    outcome: params.outcome,
    eventType: eventType && eventType.length > 0 ? eventType : undefined,
  };
}

export function useCompanyAuditTrail(params: CompanyAuditTrailParams = {}) {
  const access = useCompanyAccess();
  const query = toQuery(params);
  return useQuery({
    queryKey: companyQueryKey(
      access.user?.publicId ?? "",
      operations.auditTrail,
      JSON.stringify(query),
    ),
    queryFn: ({ signal }) => requestCompanyOperation(operations.auditTrail, { query }, signal),
    enabled: access.user !== undefined,
    placeholderData: keepPreviousData,
  });
}

/** Names an actor inside the caller's own Company; a Platform identity can never appear here. */
export async function searchCompanyAuditActors(query: string) {
  const actors = await requestCompanyOperation(operations.auditActors, { query: { query } });
  return actors.map(({ publicId, name }) => ({ publicId, name }));
}
