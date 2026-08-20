/**
 * Rows per page on both trails. The trails page by opaque cursor, so this is the size each
 * cursor was cut at — changing it changes what the next cursor returns, not just the layout.
 */
export const auditPageSize = 25;

export const auditOutcomes = ["SUCCESS", "FAILURE"] as const;

export type AuditOutcome = (typeof auditOutcomes)[number];

/** An actor a name search resolved, as the two audience-scoped endpoints return them. */
export interface AuditActorMatch {
  publicId: string;
  name: string;
}

/** The filter set both trails share; the Admin trail adds Company and scope on top of it. */
export interface AuditTrailFilters {
  occurredFrom?: string;
  occurredTo?: string;
  actorPublicId?: string;
  eventType?: string[];
  outcome?: AuditOutcome;
}

/**
 * Merges a filter change into the current URL search and always drops the cursor.
 * The server binds a cursor to the filter set it was minted under and answers 400 on a
 * mismatch, so carrying one across a filter change is a visible error, not a stale read.
 */
export function applyAuditFilterChange<TSearch extends { cursor?: string }>(
  search: TSearch,
  change: Partial<NoInfer<TSearch>>,
): TSearch {
  return { ...search, ...change, cursor: undefined };
}

/** Writes the shared filters onto a request, repeating `eventType` once per selected value. */
export function appendAuditFilterParams(
  searchParams: URLSearchParams,
  filters: AuditTrailFilters,
): void {
  if (filters.occurredFrom) searchParams.set("occurredFrom", filters.occurredFrom);
  if (filters.occurredTo) searchParams.set("occurredTo", filters.occurredTo);
  if (filters.actorPublicId) searchParams.set("actorPublicId", filters.actorPublicId);
  if (filters.outcome) searchParams.set("outcome", filters.outcome);
  for (const eventType of filters.eventType ?? []) searchParams.append("eventType", eventType);
}

/**
 * How many of the shared filters carry a value. A date range counts once however many of its
 * two bounds are set, because a reader set one window, not two filters.
 */
export function countAuditFilters(filters: AuditTrailFilters): number {
  const set = [
    Boolean(filters.occurredFrom || filters.occurredTo),
    Boolean(filters.actorPublicId),
    Boolean(filters.eventType?.length),
    Boolean(filters.outcome),
  ];
  return set.filter(Boolean).length;
}

export function hasAuditFilters(filters: AuditTrailFilters): boolean {
  return countAuditFilters(filters) > 0;
}

/** Every shared filter cleared at once — spread into a change so each key is really dropped. */
export const clearedAuditFilters: Record<keyof AuditTrailFilters, undefined> = {
  occurredFrom: undefined,
  occurredTo: undefined,
  actorPublicId: undefined,
  eventType: undefined,
  outcome: undefined,
};
