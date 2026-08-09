import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

const timestampSchema = z.string().datetime({ offset: true });

export const setupStepTypeValues = [
  "SET_COMPANY_PROFILE",
  "SET_ROLES",
  "SET_JOBS",
  "SET_BRANCHES",
  "SET_SHIFTS",
  "SET_DEPARTMENTS",
] as const;

export const setupStepStatusValues = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const;

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

export const companySetupStepSchema = z.object({
  publicId: z.string(),
  stepType: z.enum(setupStepTypeValues),
  status: z.enum(setupStepStatusValues),
  isRequired: z.boolean(),
  sequence: z.number().int().positive(),
  templateVersion: z.number().int().positive(),
  dependencies: z.array(z.enum(setupStepTypeValues)),
  startedAt: timestampSchema.nullable(),
  completedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const companySetupChecklistSchema = z.object({
  companyPublicId: z.string(),
  templateVersion: z.number().int().positive(),
  steps: z.array(companySetupStepSchema),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type CompanySetupChecklist = z.infer<typeof companySetupChecklistSchema>;
export type CompanySetupStep = z.infer<typeof companySetupStepSchema>;
export type SetupStepStatus = (typeof setupStepStatusValues)[number];
export type SetupStepType = (typeof setupStepTypeValues)[number];

export interface Company {
  publicId: string;
  logo: string | null;
  name: string;
  website: string | null;
  phoneNumber: string;
  country: string;
  companyCode: string;
  isActive: boolean;
  addressLine: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCompanyInput {
  name: string;
  phoneNumber: string;
  country: string;
  website?: string | null;
  logo?: string | null;
  isActive?: boolean;
  addressLine?: string | null;
  companyCode?: string;
}

export interface UpdateCompanyInput extends Partial<Omit<CreateCompanyInput, "companyCode">> {}

const companyDetailKeys = {
  all: ["companies"] as const,
  detail: (id: string) => ["companies", id] as const,
  profile: (id: string) => ["admin-company-profile", id] as const,
  setup: (id: string) => ["admin-company-setup", id] as const,
};

async function fetchCompany(publicId: string): Promise<Company> {
  return apiClient.get(`companies/${publicId}`).json();
}

async function fetchCompanyProfile(publicId: string): Promise<CompanyProfile> {
  const response: unknown = await apiClient.get(`companies/${publicId}/profile`).json();
  return companyProfileSchema.parse(response);
}

async function fetchCompanySetup(publicId: string): Promise<CompanySetupChecklist> {
  const response: unknown = await apiClient.get(`companies/${publicId}/setup`).json();
  return companySetupChecklistSchema.parse(response);
}

async function updateCompany(
  publicId: string,
  input: UpdateCompanyInput,
): Promise<{ message: string }> {
  return apiClient.patch(`companies/${publicId}`, { json: input }).json();
}

export function useCompany(publicId: string) {
  return useQuery({
    queryKey: companyDetailKeys.detail(publicId),
    queryFn: () => fetchCompany(publicId),
    enabled: Boolean(publicId),
  });
}

export function useCompanyProfile(publicId: string) {
  return useQuery({
    queryKey: companyDetailKeys.profile(publicId),
    queryFn: () => fetchCompanyProfile(publicId),
    enabled: Boolean(publicId),
  });
}

export function useCompanySetup(publicId: string) {
  return useQuery({
    queryKey: companyDetailKeys.setup(publicId),
    queryFn: () => fetchCompanySetup(publicId),
    enabled: Boolean(publicId),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: UpdateCompanyInput }) =>
      updateCompany(publicId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: companyDetailKeys.all }),
  });
}
