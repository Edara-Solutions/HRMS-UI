import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import {
  type CompanyAuditTrailItem,
  parseCompanyAuditTrailPage,
  type CompanyAuditTrailPage as RuntimeCompanyAuditTrailPage,
} from "./audit-runtime-contract";

export type { CompanyAuditTrailItem };
export type CompanyAuditTrailPage = RuntimeCompanyAuditTrailPage;

/**
 * Paging inputs for the Company Audit Trail. The Company route derives its scope from the
 * authenticated identity, so there is deliberately no Company or scope filter to pass.
 */
export interface CompanyAuditTrailParams {
  cursor?: string;
  limit?: number;
}

export const companyAuditTrailKeys = {
  page: (params: CompanyAuditTrailParams) => ["audit-trail", "company", params] as const,
};

/** Reads one cursor page and validates it here, so no component ever sees unparsed audit data. */
export async function fetchCompanyAuditTrail(
  params: CompanyAuditTrailParams,
): Promise<CompanyAuditTrailPage> {
  const searchParams: Record<string, string> = {};
  if (params.cursor) searchParams.cursor = params.cursor;
  if (params.limit) searchParams.limit = String(params.limit);

  const response: unknown = await apiClient.get("company/audit-trail", { searchParams }).json();

  return parseCompanyAuditTrailPage(response);
}

export function useCompanyAuditTrail(params: CompanyAuditTrailParams = {}) {
  return useQuery({
    queryKey: companyAuditTrailKeys.page(params),
    queryFn: () => fetchCompanyAuditTrail(params),
  });
}
