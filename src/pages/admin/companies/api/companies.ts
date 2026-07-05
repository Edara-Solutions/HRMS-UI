import { useQuery } from "@tanstack/react-query";
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

export interface CompanyListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CompanyListResponse {
  data: Company[];
  meta: CompanyListMeta;
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

export interface CompanyListParams {
  page?: number;
  limit?: number;
}

const companiesKeys = {
  list: (params: CompanyListParams) => ["companies", "list", params] as const,
  configList: () => ["company-configs", "list"] as const,
};

async function fetchCompanies(params: CompanyListParams): Promise<CompanyListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  return apiClient.get("companies", { searchParams }).json();
}

async function fetchCompanyConfigs(): Promise<CompanyConfigListResponse> {
  return apiClient.get("company-configs").json();
}

export function useCompanies(params: CompanyListParams = {}) {
  return useQuery({
    queryKey: companiesKeys.list(params),
    queryFn: () => fetchCompanies(params),
  });
}

export function useCompanyConfigs() {
  return useQuery({
    queryKey: companiesKeys.configList(),
    queryFn: fetchCompanyConfigs,
  });
}
