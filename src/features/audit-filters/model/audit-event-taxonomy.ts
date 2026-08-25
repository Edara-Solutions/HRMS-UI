/**
 * The event-type taxonomy the pickers render. There is no `eventFamily` on the wire and no
 * authored list of families anywhere: the grouping is computed by splitting each contract
 * event type on `.`, so the picker grows the moment the catalog does.
 */

export interface AuditEventFamily {
  /** The dotted prefix shared by every member — `company.lifecycle`. */
  family: string;
  eventTypes: string[];
}

export interface AuditEventDomain {
  /** The first segment of the event type — `company`. */
  domain: string;
  families: AuditEventFamily[];
}

export function buildAuditEventTaxonomy(eventTypes: readonly string[]): AuditEventDomain[] {
  const domains = new Map<string, Map<string, string[]>>();

  for (const eventType of [...eventTypes].sort()) {
    const segments = eventType.split(".");
    const domain = segments[0] ?? eventType;
    const family = segments.length > 1 ? segments.slice(0, -1).join(".") : eventType;

    const families = domains.get(domain) ?? new Map<string, string[]>();
    domains.set(domain, families);
    families.set(family, [...(families.get(family) ?? []), eventType]);
  }

  return [...domains].map(([domain, families]) => ({
    domain,
    families: [...families].map(([family, members]) => ({ family, eventTypes: members })),
  }));
}

/** The projection's own placeholder: it stands for a row nobody recorded, so nobody filters by it. */
const UNAVAILABLE_EVENT_TYPE = "audit.event.unavailable";

/**
 * The event types a trail can be filtered by, read off the members of its generated event
 * union rather than authored anywhere — the picker grows the moment the catalog does.
 */
export function filterableAuditEventTypes(
  events: readonly { shape: { eventType: { value: string } } }[],
): readonly string[] {
  // One event type can hold several arms — the catalog versions a payload without renaming
  // the event — and a filter offers each type once.
  return [
    ...new Set(
      events
        .map((event) => event.shape.eventType.value)
        .filter((eventType) => eventType !== UNAVAILABLE_EVENT_TYPE),
    ),
  ];
}
