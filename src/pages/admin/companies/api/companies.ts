import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";

export type CompanyLifecycleStatus = "ONBOARDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface Company {
  publicId: string;
  logo: string | null;
  name: string;
  website: string | null;
  phoneNumber: string;
  country: string;
  companyCode: string;
  isActive: boolean;
  lifecycleStatus: CompanyLifecycleStatus;
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

export interface CompanyListParams {
  page?: number;
  limit?: number;
}

const companiesKeys = {
  list: (params: CompanyListParams) => ["companies", "list", params] as const,
};

async function fetchCompanies(params: CompanyListParams): Promise<CompanyListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  return apiClient.get("companies", { searchParams }).json();
}

export function useCompanies(params: CompanyListParams = {}) {
  return useQuery({
    queryKey: companiesKeys.list(params),
    queryFn: () => fetchCompanies(params),
  });
}
