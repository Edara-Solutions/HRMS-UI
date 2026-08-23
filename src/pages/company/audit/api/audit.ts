import { useQuery } from "@tanstack/react-query";
import {
  type AuditTrailFilters,
  appendAuditFilterParams,
  filterableAuditEventTypes,
} from "@/features/audit-filters";
import { apiClient } from "@/shared/api";
import {
  CompanyAuditTrailEvent,
  type CompanyAuditTrailItem,
  parseCompanyAuditTrailPage,
  type CompanyAuditTrailPage as RuntimeCompanyAuditTrailPage,
} from "./audit-runtime-contract";

export type { CompanyAuditTrailItem };
export type CompanyAuditTrailPage = RuntimeCompanyAuditTrailPage;

/**
 * Filter and paging inputs for the Company Audit Trail. The Company route derives its scope
 * from the authenticated identity, so there is deliberately no Company or scope filter.
 */
export interface CompanyAuditTrailParams extends AuditTrailFilters {
  cursor?: string;
  limit?: number;
}

/**
 * Every event type the Company trail admits — the COMPANY-audience subset of the catalog.
 * A Platform-only type is absent because the contract has no literal for it, which is
 * audience isolation as a type error rather than a filter.
 */
export const companyAuditEventTypes = filterableAuditEventTypes(CompanyAuditTrailEvent.options);

export const companyAuditTrailKeys = {
  page: (params: CompanyAuditTrailParams) => ["audit-trail", "company", params] as const,
};

/** Reads one cursor page and validates it here, so no component ever sees unparsed audit data. */
export async function fetchCompanyAuditTrail(
  params: CompanyAuditTrailParams,
): Promise<CompanyAuditTrailPage> {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.set("cursor", params.cursor);
  if (params.limit) searchParams.set("limit", String(params.limit));
  appendAuditFilterParams(searchParams, params);

  const response: unknown = await apiClient.get("company/audit-trail", { searchParams }).json();

  return parseCompanyAuditTrailPage(response);
}

export function useCompanyAuditTrail(params: CompanyAuditTrailParams = {}) {
  return useQuery({
    queryKey: companyAuditTrailKeys.page(params),
    queryFn: () => fetchCompanyAuditTrail(params),
  });
}
