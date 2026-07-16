import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

export const companyEmailSettingsSchema = z.object({
  displayName: z.string(),
  logoUrl: z.string().optional(),
  primaryColor: z.string(),
  onPrimaryColor: z.string(),
  footerIdentity: z.string(),
  senderLocalPart: z.string(),
  replyToEmail: z.string().email(),
  defaultLocale: z.enum(["en", "ar"]),
  defaultTimeZone: z.string(),
  sendingDomain: z.string().nullable(),
  senderVerified: z.boolean(),
});

export type CompanyEmailSettings = z.infer<typeof companyEmailSettingsSchema>;
export type UpdateCompanyEmailSettings = Omit<
  CompanyEmailSettings,
  "sendingDomain" | "senderVerified"
>;

const settingsKey = (companyPublicId: string) =>
  ["company-email-settings", companyPublicId] as const;
const readinessKey = (companyPublicId: string) =>
  ["company-email-readiness", companyPublicId] as const;

async function fetchSettings(companyPublicId: string): Promise<CompanyEmailSettings> {
  const response: unknown = await apiClient
    .get(`companies/${companyPublicId}/email-settings`)
    .json();
  return companyEmailSettingsSchema.parse(response);
}

async function fetchReadiness(
  companyPublicId: string,
): Promise<{ ready: boolean; reason?: string }> {
  const response: unknown = await apiClient
    .get(`companies/${companyPublicId}/email-readiness`)
    .json();
  return z.object({ ready: z.boolean(), reason: z.string().optional() }).parse(response);
}

async function updateSettings({
  companyPublicId,
  input,
}: {
  companyPublicId: string;
  input: UpdateCompanyEmailSettings;
}): Promise<CompanyEmailSettings> {
  const response: unknown = await apiClient
    .put(`companies/${companyPublicId}/email-settings`, { json: input })
    .json();
  return companyEmailSettingsSchema.parse(response);
}

export function useCompanyEmailSettings(companyPublicId: string | null) {
  return useQuery({
    queryKey: settingsKey(companyPublicId ?? ""),
    queryFn: () => fetchSettings(companyPublicId ?? ""),
    enabled: companyPublicId !== null,
  });
}

export function useCompanyEmailReadiness(companyPublicId: string | null) {
  return useQuery({
    queryKey: readinessKey(companyPublicId ?? ""),
    queryFn: () => fetchReadiness(companyPublicId ?? ""),
    enabled: companyPublicId !== null,
  });
}

export function useUpdateCompanyEmailSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKey(variables.companyPublicId) }),
        queryClient.invalidateQueries({ queryKey: readinessKey(variables.companyPublicId) }),
      ]);
    },
  });
}
