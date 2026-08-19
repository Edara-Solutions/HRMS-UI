import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import type { AuditFilterOption } from "@/features/audit-filters";
import { apiClient } from "@/shared/api";

const companyOptionsSchema = z.object({
  data: z.array(
    z.object({
      publicId: z.string().min(1),
      companyCode: z.string().min(1),
      name: z.string().min(1),
    }),
  ),
});

/** One page of Companies is enough to pick from by name; the picker filters it in the browser. */
const optionPageSize = 100;

async function fetchAuditCompanyOptions(): Promise<AuditFilterOption[]> {
  const response: unknown = await apiClient
    .get("companies", { searchParams: { page: "1", limit: String(optionPageSize) } })
    .json();

  return companyOptionsSchema.parse(response).data.map((company) => ({
    value: company.publicId,
    label: company.name,
    hint: company.companyCode,
  }));
}

/** Company names for the Admin trail's Company filter — the replacement for its UUID box. */
export function useAuditCompanyOptions() {
  return useQuery({
    queryKey: ["audit-trail", "platform", "company-options"],
    queryFn: fetchAuditCompanyOptions,
  });
}
