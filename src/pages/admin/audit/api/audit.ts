import { useQuery } from "@tanstack/react-query";
import {
  type AuditTrailFilters,
  appendAuditFilterParams,
  filterableAuditEventTypes,
} from "@/features/audit-filters";
import { apiClient } from "@/shared/api";
import {
  PlatformAuditTrailEvent,
  type PlatformAuditTrailItem,
  parsePlatformAuditTrailPage,
  type PlatformAuditTrailPage as RuntimePlatformAuditTrailPage,
} from "./audit-runtime-contract";

export type { PlatformAuditTrailItem };

/**
 * How the audit row was written, read off the generated contract so the two cannot drift.
 * Every available Platform arm carries it, so the first one names the union for all of them.
 */
export type AuditRecordingBinding = Extract<
  PlatformAuditTrailItem,
  { recordingBinding: string }
>["recordingBinding"];
export type PlatformAuditTrailPage = RuntimePlatformAuditTrailPage;

export type PlatformAuditTrailScope = "PLATFORM" | "COMPANY";

export interface PlatformAuditTrailParams extends AuditTrailFilters {
  cursor?: string;
  limit?: number;
  companyPublicId?: string;
  scope?: PlatformAuditTrailScope;
  /** Platform-only: everything else the system recorded under one request. */
  traceId?: string;
}

/** Every event type the Platform trail admits, read off the generated contract. */
export const platformAuditEventTypes = filterableAuditEventTypes(PlatformAuditTrailEvent.options);

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
  if (params.traceId) searchParams.set("traceId", params.traceId);
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
