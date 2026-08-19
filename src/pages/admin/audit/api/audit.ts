import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import {
  type PlatformAuditTrailItem,
  parsePlatformAuditTrailPage,
  type PlatformAuditTrailPage as RuntimePlatformAuditTrailPage,
} from "./audit-runtime-contract";

export type { PlatformAuditTrailItem };
export type PlatformAuditTrailPage = RuntimePlatformAuditTrailPage;

export type PlatformAuditTrailScope = "PLATFORM" | "COMPANY";

export interface PlatformAuditTrailParams {
  cursor?: string;
  limit?: number;
  companyPublicId?: string;
  scope?: PlatformAuditTrailScope;
}

export const auditTrailKeys = {
  all: ["audit-trail"] as const,
  platform: (params: PlatformAuditTrailParams) => ["audit-trail", "platform", params] as const,
};

export async function fetchPlatformAuditTrail(
  params: PlatformAuditTrailParams,
): Promise<PlatformAuditTrailPage> {
  const searchParams: Record<string, string> = {};
  if (params.cursor) searchParams.cursor = params.cursor;
  if (params.limit) searchParams.limit = String(params.limit);
  if (params.companyPublicId) searchParams.companyPublicId = params.companyPublicId;
  if (params.scope) searchParams.scope = params.scope;

  const response: unknown = await apiClient.get("platform/audit-trail", { searchParams }).json();

  return parsePlatformAuditTrailPage(response);
}

export function usePlatformAuditTrail(params: PlatformAuditTrailParams = {}) {
  return useQuery({
    queryKey: auditTrailKeys.platform(params),
    queryFn: () => fetchPlatformAuditTrail(params),
  });
}
