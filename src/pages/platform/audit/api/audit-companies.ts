import { useQuery } from "@tanstack/react-query";
import type { AuditFilterOption } from "@/features/audit-filters";
import {
  platformCompanyOperations as companiesOps,
  platformQueryKey,
  requestPlatformOperation,
  usePlatformAccess,
} from "@/shared/api";

/** One page of Companies is enough to pick from by name; the picker filters it in the browser. */
const OPTION_PAGE_SIZE = 100;

async function fetchAuditCompanyOptions(): Promise<AuditFilterOption[]> {
  const response = await requestPlatformOperation(companiesOps.companies, {
    query: { page: 1, limit: OPTION_PAGE_SIZE },
  });
  return response.data.map((company) => ({
    value: company.publicId,
    label: company.name,
    hint: company.companyCode,
  }));
}

/** Company names for the Admin trail's Company filter — the replacement for its UUID box. */
export function useAuditCompanyOptions() {
  const access = usePlatformAccess();
  return useQuery({
    queryKey: platformQueryKey(access.user?.publicId ?? "", companiesOps.companies, "audit"),
    queryFn: () => fetchAuditCompanyOptions(),
    enabled: access.availability(companiesOps.companies.key).state === "enabled",
    retry: false,
  });
}
