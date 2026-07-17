import { useQuery } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { z } from "zod";
import { apiClient, type components } from "@/shared/api";

export type CompanySendingDomain = Pick<
  components["schemas"]["SendingDomain"],
  | "domain"
  | "status"
  | "health"
  | "dnsRecords"
  | "checkResults"
  | "verifiedAt"
  | "lastFailure"
  | "createdAt"
  | "updatedAt"
>;

const companySendingDomainKeys = {
  detail: (companyPublicId: string) => ["company-sending-domain", companyPublicId] as const,
};

const dnsRecordKindSchema = z.enum(["OWNERSHIP_TXT", "DKIM", "RETURN_PATH"]);
const dnsCheckStatusSchema = z.enum(["PENDING", "VERIFIED", "FAILED"]);
const companySendingDomainSchema = z.object({
  domain: z.string().min(1),
  status: z.enum(["UNCONFIGURED", "PENDING", "VERIFIED", "FAILED"]),
  health: z.enum(["HEALTHY", "UNHEALTHY", "UNKNOWN"]),
  dnsRecords: z.array(
    z.object({
      kind: dnsRecordKindSchema,
      host: z.string(),
      recordType: z.enum(["TXT", "CNAME", "MX"]),
      value: z.string(),
      description: z.string(),
    }),
  ),
  checkResults: z.array(
    z.object({
      kind: dnsRecordKindSchema,
      status: dnsCheckStatusSchema,
      failureDetail: z.string().nullable(),
    }),
  ),
  verifiedAt: z.string().datetime().nullable(),
  lastFailure: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}) satisfies z.ZodType<CompanySendingDomain>;

async function fetchCompanySendingDomain(
  companyPublicId: string,
): Promise<CompanySendingDomain | null> {
  try {
    const response: unknown = await apiClient
      .get(`companies/${companyPublicId}/sending-domain`)
      .json();
    return companySendingDomainSchema.parse(response);
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 404) return null;
    throw error;
  }
}

/** Reads the Company's own sending-domain aggregate, including its latest DNS verification result. */
export function useCompanySendingDomain(companyPublicId: string) {
  return useQuery({
    queryKey: companySendingDomainKeys.detail(companyPublicId),
    queryFn: () => fetchCompanySendingDomain(companyPublicId),
    enabled: companyPublicId.length > 0,
  });
}
