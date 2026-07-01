import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const companiesKeys = {
  all: ["companies"] as const,
  list: (params: CompanyListParams) => ["companies", "list", params] as const,
  detail: (id: string) => ["companies", id] as const,
  configs: ["company-configs"] as const,
  configList: () => ["company-configs", "list"] as const,
  configDetail: (id: string) => ["company-configs", id] as const,
};

// ─── Params ───────────────────────────────────────────────────────────────────

export interface CompanyListParams {
  page?: number;
  limit?: number;
}

// ─── API Fns ──────────────────────────────────────────────────────────────────

async function fetchCompanies(params: CompanyListParams): Promise<CompanyListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  return apiClient.get("companies", { searchParams }).json();
}

async function fetchCompany(publicId: string): Promise<Company> {
  return apiClient.get(`companies/${publicId}`).json();
}

async function createCompany(input: CreateCompanyInput): Promise<Company> {
  return apiClient.post("companies", { json: input }).json();
}

async function updateCompany(
  publicId: string,
  input: UpdateCompanyInput,
): Promise<{ message: string }> {
  return apiClient.patch(`companies/${publicId}`, { json: input }).json();
}

async function deleteCompany(publicId: string): Promise<{ message: string }> {
  return apiClient.delete(`companies/${publicId}`).json();
}

async function fetchCompanyConfigs(): Promise<CompanyConfigListResponse> {
  return apiClient.get("company-configs").json();
}

async function fetchCompanyConfig(publicId: string): Promise<CompanyConfig> {
  return apiClient.get(`company-configs/${publicId}`).json();
}

async function updateCompanyConfig(
  publicId: string,
  input: UpdateCompanyConfigInput,
): Promise<{ message: string }> {
  return apiClient.patch(`company-configs/${publicId}`, { json: input }).json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCompanies(params: CompanyListParams = {}) {
  return useQuery({
    queryKey: companiesKeys.list(params),
    queryFn: () => fetchCompanies(params),
  });
}

export function useCompany(publicId: string) {
  return useQuery({
    queryKey: companiesKeys.detail(publicId),
    queryFn: () => fetchCompany(publicId),
    enabled: Boolean(publicId),
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => qc.invalidateQueries({ queryKey: companiesKeys.all }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: UpdateCompanyInput }) =>
      updateCompany(publicId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: companiesKeys.all }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => qc.invalidateQueries({ queryKey: companiesKeys.all }),
  });
}

export function useCompanyConfigs() {
  return useQuery({
    queryKey: companiesKeys.configList(),
    queryFn: fetchCompanyConfigs,
  });
}

export function useCompanyConfig(publicId: string) {
  return useQuery({
    queryKey: companiesKeys.configDetail(publicId),
    queryFn: () => fetchCompanyConfig(publicId),
    enabled: Boolean(publicId),
  });
}

export function useUpdateCompanyConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: UpdateCompanyConfigInput }) =>
      updateCompanyConfig(publicId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: companiesKeys.configs }),
  });
}
