import { useQuery } from "@tanstack/react-query";
import { type AuditTrailFilters, appendAuditFilterParams } from "@/features/audit-filters";
import { apiClient } from "@/shared/api";
import {
  PlatformAuditTrailEvent,
  type PlatformAuditTrailItem,
  parsePlatformAuditTrailPage,
  type PlatformAuditTrailPage as RuntimePlatformAuditTrailPage,
} from "./audit-runtime-contract";

export type { PlatformAuditTrailItem };
export type PlatformAuditTrailPage = RuntimePlatformAuditTrailPage;

export type PlatformAuditTrailScope = "PLATFORM" | "COMPANY";

export interface PlatformAuditTrailParams extends AuditTrailFilters {
  cursor?: string;
  limit?: number;
  companyPublicId?: string;
  scope?: PlatformAuditTrailScope;
}

/**
 * Every event type the Platform trail admits, read off the generated contract rather than
 * authored here — the picker grows with the catalog. `audit.event.unavailable` is the
 * projection's own placeholder, not something that was ever recorded, so it is not filterable.
 */
export const platformAuditEventTypes: readonly string[] = PlatformAuditTrailEvent.options
  .map((event) => event.shape.eventType.value)
  .filter((eventType) => eventType !== "audit.event.unavailable");

export const auditTrailKeys = {
  all: ["audit-trail"] as const,
  platform: (params: PlatformAuditTrailParams) => ["audit-trail", "platform", params] as const,
};

export async function fetchPlatformAuditTrail(
  params: PlatformAuditTrailParams,
): Promise<PlatformAuditTrailPage> {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.set("cursor", params.cursor);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.companyPublicId) searchParams.set("companyPublicId", params.companyPublicId);
  if (params.scope) searchParams.set("scope", params.scope);
  appendAuditFilterParams(searchParams, params);

  const response: unknown = await apiClient.get("platform/audit-trail", { searchParams }).json();

  return parsePlatformAuditTrailPage(response);
}

export function usePlatformAuditTrail(params: PlatformAuditTrailParams = {}) {
  return useQuery({
    queryKey: auditTrailKeys.platform(params),
    queryFn: () => fetchPlatformAuditTrail(params),
  });
}
