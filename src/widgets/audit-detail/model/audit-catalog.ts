import type { components } from "@/shared/api";

/**
 * One trail item as the catalog defines it, minus the sentinel a projection emits for a row it
 * cannot show — that row carries no actor, targets or details, so nothing here applies to it.
 *
 * Every widget in this slice reads the catalog through these aliases rather than reaching into
 * the generated schema itself, so a contract change lands in one place.
 */
export type PlatformAuditEvent = Exclude<
  components["schemas"]["PlatformAuditTrailPage"]["items"][number],
  { eventType: "audit.event.unavailable" }
>;

export type CompanyAuditEvent = Exclude<
  components["schemas"]["CompanyAuditTrailPage"]["items"][number],
  { eventType: "audit.event.unavailable" }
>;

export type CatalogAuditEvent = PlatformAuditEvent | CompanyAuditEvent;

export type CatalogAuditActor = CatalogAuditEvent["actor"];

export type CatalogAuditTarget = CatalogAuditEvent["targets"][number];
