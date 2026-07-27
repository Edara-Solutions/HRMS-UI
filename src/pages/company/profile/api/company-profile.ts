import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

const timestampSchema = z.string().datetime({ offset: true });

export const profileFieldNames = [
  "name",
  "logoUrl",
  "email",
  "phone",
  "country",
  "city",
  "addressLine",
  "taxNumber",
  "commercialNumber",
] as const;

export const requiredProfileFieldNames = [
  "name",
  "email",
  "phone",
  "country",
  "city",
  "addressLine",
] as const;

export const companyProfileSchema = z.object({
  publicId: z.string(),
  companyPublicId: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  addressLine: z.string().nullable(),
  taxNumber: z.string().nullable(),
  commercialNumber: z.string().nullable(),
  status: z.enum(["INCOMPLETE", "COMPLETE"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const setupStepTypeSchema = z.enum([
  "SET_COMPANY_PROFILE",
  "SET_ROLES",
  "SET_JOBS",
  "SET_BRANCHES",
  "SET_SHIFTS",
  "SET_DEPARTMENTS",
]);

export const companySetupChecklistSchema = z.object({
  companyPublicId: z.string(),
  templateVersion: z.number().int().positive(),
  steps: z.array(
    z.object({
      publicId: z.string(),
      stepType: setupStepTypeSchema,
      status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"]),
      isRequired: z.boolean(),
      sequence: z.number().int().positive(),
      templateVersion: z.number().int().positive(),
      dependencies: z.array(setupStepTypeSchema),
      startedAt: timestampSchema.nullable(),
      completedAt: timestampSchema.nullable(),
      createdAt: timestampSchema,
      updatedAt: timestampSchema,
    }),
  ),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type ProfileFieldName = (typeof profileFieldNames)[number];
export type RequiredProfileFieldName = (typeof requiredProfileFieldNames)[number];
export type CompanySetupChecklist = z.infer<typeof companySetupChecklistSchema>;
export type UpdateCompanyProfileInput = Partial<
  Pick<
    CompanyProfile,
    | "name"
    | "logoUrl"
    | "email"
    | "phone"
    | "country"
    | "city"
    | "addressLine"
    | "taxNumber"
    | "commercialNumber"
  >
>;

export const companyProfileKeys = {
  detail: (companyPublicId: string) => ["company-profile", companyPublicId] as const,
  setup: (companyPublicId: string) => ["company-setup", companyPublicId] as const,
  activation: (companyPublicId: string) => ["company-activation", companyPublicId] as const,
};

async function fetchCompanyProfile(companyPublicId: string): Promise<CompanyProfile> {
  const response: unknown = await apiClient.get(`companies/${companyPublicId}/profile`).json();
  return companyProfileSchema.parse(response);
}

async function fetchCompanySetup(companyPublicId: string): Promise<CompanySetupChecklist> {
  const response: unknown = await apiClient.get(`companies/${companyPublicId}/setup`).json();
  return companySetupChecklistSchema.parse(response);
}

async function updateCompanyProfile({
  companyPublicId,
  input,
}: {
  companyPublicId: string;
  input: UpdateCompanyProfileInput;
}): Promise<CompanyProfile> {
  const response: unknown = await apiClient
    .patch(`companies/${companyPublicId}/profile`, { json: input })
    .json();
  return companyProfileSchema.parse(response);
}

export function useCompanyProfile(companyPublicId: string | null) {
  return useQuery({
    queryKey: companyProfileKeys.detail(companyPublicId ?? ""),
    queryFn: () => fetchCompanyProfile(companyPublicId ?? ""),
    enabled: companyPublicId !== null,
  });
}

export function useCompanySetupChecklist(companyPublicId: string | null) {
  return useQuery({
    queryKey: companyProfileKeys.setup(companyPublicId ?? ""),
    queryFn: () => fetchCompanySetup(companyPublicId ?? ""),
    enabled: companyPublicId !== null,
  });
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompanyProfile,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: companyProfileKeys.detail(variables.companyPublicId),
        }),
        queryClient.invalidateQueries({
          queryKey: companyProfileKeys.setup(variables.companyPublicId),
        }),
        queryClient.invalidateQueries({
          queryKey: companyProfileKeys.activation(variables.companyPublicId),
        }),
      ]);
    },
  });
}
