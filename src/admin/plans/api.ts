import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanFeature = "ATTENDANCE" | "ANALYTICS" | "OVERVIEW" | "TEAM_MANAGEMENT";

export interface Money {
  currencyCode: string;
  currencyExponent: number;
  amountMinor: number;
  amountMajor: string;
  formattedAmount: string;
}

export interface PlanPrice {
  publicId: string;
  planId?: number;
  countryCode: string | null;
  regionCode: string | null;
  billingInterval: string;
  intervalCount: number;
  isActive: boolean;
  money: Money;
  createdAt: string;
  updatedAt: string;
}

export interface EffectivePrice {
  source: "country" | "region" | "default_row";
  pricePublicId: string;
  billingInterval: string;
  intervalCount: number;
  countryCode: string | null;
  regionCode: string | null;
  money: Money;
}

export interface Plan {
  publicId: string;
  name: string;
  description: string | null;
  duration: number;
  features: PlanFeature[];
  limits: Record<string, number>;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  prices?: PlanPrice[];
  effectivePrice?: EffectivePrice | null;
}

export interface PlanListResponse {
  data: Plan[];
}

export interface CreatePlanInput {
  name: string;
  duration: number;
  features: PlanFeature[];
  description?: string | null;
  limits?: Record<string, number>;
  isPublic?: boolean;
  isActive?: boolean;
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {}

export interface CreatePlanPriceInput {
  currencyCode: string;
  amountMinor: number;
  billingInterval: string;
  intervalCount?: number;
  countryCode?: string | null;
  regionCode?: string | null;
  isActive?: boolean;
}

export interface UpdatePlanPriceInput {
  amountMinor?: number;
  isActive?: boolean;
  currencyCode?: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const plansKeys = {
  all: ["plans"] as const,
  list: (params: PlanListParams) => ["plans", "list", params] as const,
  detail: (id: string) => ["plans", id] as const,
  prices: (id: string) => ["plans", id, "prices"] as const,
};

// ─── Params ───────────────────────────────────────────────────────────────────

export interface PlanListParams {
  name?: string;
  isPublic?: boolean;
  isActive?: boolean;
}

// ─── API Fns ──────────────────────────────────────────────────────────────────

async function fetchPlans(params: PlanListParams = {}): Promise<PlanListResponse> {
  const searchParams = new URLSearchParams();
  if (params.name) searchParams.set("name", params.name);
  if (params.isPublic !== undefined) searchParams.set("isPublic", String(params.isPublic));
  if (params.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
  return apiClient.get("plans", { searchParams }).json();
}

async function fetchPlan(publicId: string): Promise<Plan> {
  return apiClient.get(`plans/${publicId}`).json();
}

async function createPlan(input: CreatePlanInput): Promise<Plan> {
  return apiClient.post("plans", { json: input }).json();
}

async function updatePlan(publicId: string, input: UpdatePlanInput): Promise<Plan> {
  return apiClient.patch(`plans/${publicId}`, { json: input }).json();
}

async function deletePlan(publicId: string): Promise<{ message: string }> {
  return apiClient.delete(`plans/${publicId}`).json();
}

async function fetchPlanPrices(publicId: string): Promise<{ data: PlanPrice[] }> {
  return apiClient.get(`plans/${publicId}/prices`).json();
}

async function createPlanPrice(publicId: string, input: CreatePlanPriceInput): Promise<PlanPrice> {
  return apiClient.post(`plans/${publicId}/prices`, { json: input }).json();
}

async function updatePlanPrice(
  pricePublicId: string,
  input: UpdatePlanPriceInput,
): Promise<PlanPrice> {
  return apiClient.patch(`plan-prices/${pricePublicId}`, { json: input }).json();
}

async function deletePlanPrice(pricePublicId: string): Promise<{ message: string }> {
  return apiClient.delete(`plan-prices/${pricePublicId}`).json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePlans(params: PlanListParams = {}) {
  return useQuery({
    queryKey: plansKeys.list(params),
    queryFn: () => fetchPlans(params),
  });
}

export function usePlan(publicId: string) {
  return useQuery({
    queryKey: plansKeys.detail(publicId),
    queryFn: () => fetchPlan(publicId),
    enabled: Boolean(publicId),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKeys.all }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: UpdatePlanInput }) =>
      updatePlan(publicId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKeys.all }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKeys.all }),
  });
}

export function usePlanPrices(publicId: string) {
  return useQuery({
    queryKey: plansKeys.prices(publicId),
    queryFn: () => fetchPlanPrices(publicId),
    enabled: Boolean(publicId),
  });
}

export function useCreatePlanPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: CreatePlanPriceInput }) =>
      createPlanPrice(publicId, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: plansKeys.prices(vars.publicId) });
      qc.invalidateQueries({ queryKey: plansKeys.all });
    },
  });
}

export function useUpdatePlanPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pricePublicId,
      input,
    }: {
      pricePublicId: string;
      input: UpdatePlanPriceInput;
    }) => updatePlanPrice(pricePublicId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKeys.all }),
  });
}

export function useDeletePlanPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePlanPrice,
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKeys.all }),
  });
}
