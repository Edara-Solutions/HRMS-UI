import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "FROZEN" | "CANCELLED" | "EXPIRED";

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

export interface SiteStatus {
  isFrozen: boolean;
  isReadOnly: boolean;
  isBlocked: boolean;
  isUnderMaintenance: boolean;
  note: string | null;
}

export interface CompanyConfig {
  public_id: string;
  companyId: number;
  planId: number;
  subscriptionStatus: SubscriptionStatus;
  siteStatus: SiteStatus;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  trialEndDate: string | null;
  subscriptionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  company?: Pick<
    Company,
    "publicId" | "name" | "companyCode" | "country" | "isActive" | "phoneNumber"
  >;
  plan?: {
    publicId: string;
    name: string;
    duration: number;
    features: string[];
    limits: Record<string, number>;
    isPublic: boolean;
    isActive: boolean;
  };
}

export interface CompanyConfigListResponse {
  data: CompanyConfig[];
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

export interface UpdateCompanyConfigInput {
  planPublicId?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  trialEndDate?: string | null;
  subscriptionNotes?: string | null;
  siteStatus?: Partial<SiteStatus>;
}

const companyDetailKeys = {
  all: ["companies"] as const,
  detail: (id: string) => ["companies", id] as const,
  configs: ["company-configs"] as const,
  configList: () => ["company-configs", "list"] as const,
};

async function fetchCompany(publicId: string): Promise<Company> {
  return apiClient.get(`companies/${publicId}`).json();
}

async function updateCompany(
  publicId: string,
  input: UpdateCompanyInput,
): Promise<{ message: string }> {
  return apiClient.patch(`companies/${publicId}`, { json: input }).json();
}

async function fetchCompanyConfigs(): Promise<CompanyConfigListResponse> {
  return apiClient.get("company-configs").json();
}

async function updateCompanyConfig(
  publicId: string,
  input: UpdateCompanyConfigInput,
): Promise<{ message: string }> {
  return apiClient.patch(`company-configs/${publicId}`, { json: input }).json();
}

export function useCompany(publicId: string) {
  return useQuery({
    queryKey: companyDetailKeys.detail(publicId),
    queryFn: () => fetchCompany(publicId),
    enabled: Boolean(publicId),
  });
}

export function useCompanyConfigs() {
  return useQuery({
    queryKey: companyDetailKeys.configList(),
    queryFn: fetchCompanyConfigs,
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

export function useUpdateCompanyConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: UpdateCompanyConfigInput }) =>
      updateCompanyConfig(publicId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: companyDetailKeys.configs }),
  });
}
