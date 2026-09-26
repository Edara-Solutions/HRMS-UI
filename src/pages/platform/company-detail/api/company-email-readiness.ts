import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient, type components } from "@/shared/api";

type CompanyEmailReadiness =
  | { status: "ready"; sender: string }
  | { status: "needs-attention"; sender?: undefined }
  | { status: "unavailable"; sender?: undefined };
type CompanyEmailType = Pick<
  components["schemas"]["EmailType"],
  "key" | "context" | "supportedLocales"
>;

const companyEmailReadinessKeys = {
  detail: (companyPublicId: string) => ["company-email-readiness", companyPublicId] as const,
};

const emailLocaleSchema = z.enum(["en", "ar"]);
const companyEmailTypeListSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      context: z.enum(["EDARA", "COMPANY"]),
      supportedLocales: z.array(emailLocaleSchema),
    }),
  ),
}) satisfies z.ZodType<{ items: CompanyEmailType[] }>;
const emailPreviewSchema = z.object({
  senderIdentity: z
    .object({ name: z.string(), address: z.string(), replyTo: z.string() })
    .optional(),
}) satisfies z.ZodType<Pick<components["schemas"]["EmailPreview"], "senderIdentity">>;

async function fetchCompanyEmailReadiness(companyPublicId: string): Promise<CompanyEmailReadiness> {
  const emailTypesResponse: unknown = await apiClient.get("email-types").json();
  const companyEmailType = companyEmailTypeListSchema
    .parse(emailTypesResponse)
    .items.find((emailType) => emailType.context === "COMPANY");

  if (!companyEmailType) return { status: "unavailable" };

  const locale = companyEmailType.supportedLocales[0] ?? "en";
  const previewResponse: unknown = await apiClient
    .get(`email-types/${companyEmailType.key}/preview`, {
      searchParams: { companyPublicId, locale },
    })
    .json();
  const senderIdentity = emailPreviewSchema.parse(previewResponse).senderIdentity;

  return senderIdentity
    ? { status: "ready", sender: `${senderIdentity.name} <${senderIdentity.address}>` }
    : { status: "needs-attention" };
}

export function useCompanyEmailReadiness(companyPublicId: string) {
  return useQuery({
    queryKey: companyEmailReadinessKeys.detail(companyPublicId),
    queryFn: () => fetchCompanyEmailReadiness(companyPublicId),
    enabled: companyPublicId.length > 0,
  });
}
