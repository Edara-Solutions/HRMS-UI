import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "./client";

const knownPlanFeatureValues = ["ATTENDANCE", "ANALYTICS", "OVERVIEW", "TEAM_MANAGEMENT"] as const;
const knownPlanLimitValues = ["MAX_USERS", "MAX_DEPARTMENTS", "MAX_POSITIONS"] as const;
const billingIntervalValues = ["monthly", "quarterly", "biannual", "annually"] as const;

export const ALL_KNOWN_PLAN_FEATURES = knownPlanFeatureValues;
export const ALL_KNOWN_PLAN_LIMITS = knownPlanLimitValues;
export const BILLING_INTERVAL_VALUES = billingIntervalValues;

export type KnownPlanFeature = (typeof knownPlanFeatureValues)[number];
export type PlanFeature = KnownPlanFeature | (string & {});
export type KnownPlanLimit = (typeof knownPlanLimitValues)[number];
export type PlanLimits = Partial<Record<KnownPlanLimit, number>>;
export type BillingInterval = (typeof billingIntervalValues)[number];

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
  billingInterval: BillingInterval;
  intervalCount: number;
  isActive: boolean;
  money: Money;
  createdAt: string;
  updatedAt: string;
}

export interface EffectivePrice {
  source: "country" | "region" | "default_row";
  pricePublicId: string;
  billingInterval: BillingInterval;
  intervalCount: number;
  countryCode: string | null;
  regionCode: string | null;
  money: Money;
}

export interface ResolvedEffectivePrice extends EffectivePrice {
  planPublicId: string;
  planName: string;
}

export interface BasePlan {
  publicId: string;
  name: string;
  description: string | null;
  duration: number;
  features: PlanFeature[];
  limits: PlanLimits | null;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Plan extends BasePlan {
  prices: PlanPrice[];
  effectivePrice: EffectivePrice | null;
}

export interface PlanListResponse {
  data: Plan[];
}

export interface PlanPriceListResponse {
  data: PlanPrice[];
}

export interface CreatePlanInput {
  name: string;
  duration: number;
  features: PlanFeature[];
  description?: string | null;
  limits?: PlanLimits;
  isPublic?: boolean;
  isActive?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  features?: PlanFeature[];
  description?: string | null;
  limits?: PlanLimits;
  isPublic?: boolean;
  isActive?: boolean;
}

export interface CreatePlanPriceInput {
  currencyCode: string;
  amountMinor: number;
  billingInterval: BillingInterval;
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

export interface PlanListParams {
  name?: string;
  isPublic?: boolean;
  isActive?: boolean;
  countryCode?: string;
  regionCode?: string;
  currencyCode?: string;
  billingInterval?: BillingInterval;
  intervalCount?: number;
}

export interface PublicPlanListParams {
  name?: string;
  isActive?: boolean;
  countryCode?: string;
  regionCode?: string;
  currencyCode?: string;
  billingInterval?: BillingInterval;
  intervalCount?: number;
}

export interface PlanDetailParams {
  countryCode?: string;
  regionCode?: string;
  currencyCode?: string;
  billingInterval?: BillingInterval;
  intervalCount?: number;
}

export interface EffectivePriceParams {
  currencyCode: string;
  billingInterval: BillingInterval;
  countryCode?: string;
  regionCode?: string;
  intervalCount?: number;
}

export interface PlanPriceListParams {
  countryCode?: string;
  regionCode?: string;
  currencyCode?: string;
  billingInterval?: BillingInterval;
  intervalCount?: number;
  isActive?: boolean;
}

const moneySchema = z.object({
  currencyCode: z.string().min(1),
  currencyExponent: z.number().int().nonnegative(),
  amountMinor: z.number().int().nonnegative(),
  amountMajor: z.string().min(1),
  formattedAmount: z.string().min(1),
});

const billingIntervalSchema = z.enum(billingIntervalValues);

const planPriceSchema = z.object({
  publicId: z.string().uuid(),
  planId: z.number().int().optional(),
  countryCode: z.string().min(1).nullable(),
  regionCode: z.string().min(1).nullable(),
  billingInterval: billingIntervalSchema,
  intervalCount: z.number().int().positive(),
  isActive: z.boolean(),
  money: moneySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const effectivePriceSchema = z.object({
  source: z.enum(["country", "region", "default_row"]),
  pricePublicId: z.string().uuid(),
  billingInterval: billingIntervalSchema,
  intervalCount: z.number().int().positive(),
  countryCode: z.string().min(1).nullable(),
  regionCode: z.string().min(1).nullable(),
  money: moneySchema,
});

const resolvedEffectivePriceSchema = effectivePriceSchema.extend({
  planPublicId: z.string().uuid(),
  planName: z.string().min(1),
});

const planLimitsSchema = z.record(z.string(), z.number().int().nonnegative()).nullable();

const basePlanSchema = z.object({
  publicId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  duration: z.number().int().positive(),
  features: z.array(z.string().min(1)),
  limits: planLimitsSchema,
  isPublic: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

const planSchema = basePlanSchema.extend({
  prices: z.array(planPriceSchema),
  effectivePrice: effectivePriceSchema.nullable(),
});

const planListResponseSchema = z.object({
  data: z.array(planSchema),
});

const planPriceListResponseSchema = z.object({
  data: z.array(planPriceSchema),
});

const deleteResponseSchema = z.object({
  message: z.string().min(1),
});

export function isBillingInterval(value: string): value is BillingInterval {
  return billingIntervalValues.some((interval) => interval === value);
}

function setSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | boolean | null | undefined,
) {
  if (value === undefined || value === null || value === "") return;
  searchParams.set(key, String(value));
}

function createSearchParams(params: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    setSearchParam(searchParams, key, value);
  }
  return searchParams;
}

async function parseJson<T>(request: Promise<unknown>, schema: z.ZodType<T>): Promise<T> {
  const data = await request;
  return schema.parse(data);
}

async function fetchPlans(params: PlanListParams = {}): Promise<PlanListResponse> {
  return parseJson(
    apiClient
      .get("plans", {
        searchParams: createSearchParams({
          name: params.name,
          isPublic: params.isPublic,
          isActive: params.isActive,
          countryCode: params.countryCode,
          regionCode: params.regionCode,
          currencyCode: params.currencyCode,
          billingInterval: params.billingInterval,
          intervalCount: params.intervalCount,
        }),
      })
      .json<unknown>(),
    planListResponseSchema,
  );
}

async function fetchPublicPlans(params: PublicPlanListParams = {}): Promise<PlanListResponse> {
  return parseJson(
    apiClient
      .get("plans/public", {
        searchParams: createSearchParams({
          name: params.name,
          isActive: params.isActive,
          countryCode: params.countryCode,
          regionCode: params.regionCode,
          currencyCode: params.currencyCode,
          billingInterval: params.billingInterval,
          intervalCount: params.intervalCount,
        }),
      })
      .json<unknown>(),
    planListResponseSchema,
  );
}

async function fetchPlan(publicId: string, params: PlanDetailParams = {}): Promise<Plan> {
  return parseJson(
    apiClient
      .get(`plans/${publicId}`, {
        searchParams: createSearchParams({
          countryCode: params.countryCode,
          regionCode: params.regionCode,
          currencyCode: params.currencyCode,
          billingInterval: params.billingInterval,
          intervalCount: params.intervalCount,
        }),
      })
      .json<unknown>(),
    planSchema,
  );
}

async function createPlan(input: CreatePlanInput): Promise<BasePlan> {
  return parseJson(apiClient.post("plans", { json: input }).json<unknown>(), basePlanSchema);
}

async function updatePlan(publicId: string, input: UpdatePlanInput): Promise<BasePlan> {
  return parseJson(
    apiClient.patch(`plans/${publicId}`, { json: input }).json<unknown>(),
    basePlanSchema,
  );
}

async function deletePlan(publicId: string): Promise<{ message: string }> {
  return parseJson(apiClient.delete(`plans/${publicId}`).json<unknown>(), deleteResponseSchema);
}

async function fetchEffectivePlanPrice(
  publicId: string,
  params: EffectivePriceParams,
): Promise<ResolvedEffectivePrice> {
  return parseJson(
    apiClient
      .get(`plans/${publicId}/effective-price`, {
        searchParams: createSearchParams({
          countryCode: params.countryCode,
          regionCode: params.regionCode,
          currencyCode: params.currencyCode,
          billingInterval: params.billingInterval,
          intervalCount: params.intervalCount,
        }),
      })
      .json<unknown>(),
    resolvedEffectivePriceSchema,
  );
}

async function fetchPlanPrices(
  publicId: string,
  params: PlanPriceListParams = {},
): Promise<PlanPriceListResponse> {
  return parseJson(
    apiClient
      .get(`plans/${publicId}/prices`, {
        searchParams: createSearchParams({
          countryCode: params.countryCode,
          regionCode: params.regionCode,
          currencyCode: params.currencyCode,
          billingInterval: params.billingInterval,
          intervalCount: params.intervalCount,
          isActive: params.isActive,
        }),
      })
      .json<unknown>(),
    planPriceListResponseSchema,
  );
}

async function fetchPlanPrice(pricePublicId: string): Promise<PlanPrice> {
  return parseJson(apiClient.get(`plan-prices/${pricePublicId}`).json<unknown>(), planPriceSchema);
}

async function createPlanPrice(publicId: string, input: CreatePlanPriceInput): Promise<PlanPrice> {
  return parseJson(
    apiClient.post(`plans/${publicId}/prices`, { json: input }).json<unknown>(),
    planPriceSchema,
  );
}

async function updatePlanPrice(
  pricePublicId: string,
  input: UpdatePlanPriceInput,
): Promise<PlanPrice> {
  return parseJson(
    apiClient.patch(`plan-prices/${pricePublicId}`, { json: input }).json<unknown>(),
    planPriceSchema,
  );
}

async function deletePlanPrice(pricePublicId: string): Promise<{ message: string }> {
  return parseJson(
    apiClient.delete(`plan-prices/${pricePublicId}`).json<unknown>(),
    deleteResponseSchema,
  );
}

export const plansKeys = {
  all: ["plans"] as const,
  list: (params: PlanListParams) => ["plans", "list", params] as const,
  publicList: (params: PublicPlanListParams) => ["plans", "public", params] as const,
  detail: (publicId: string, params: PlanDetailParams) =>
    ["plans", "detail", publicId, params] as const,
  prices: (publicId: string, params: PlanPriceListParams) =>
    ["plans", "detail", publicId, "prices", params] as const,
  priceDetail: (pricePublicId: string) => ["plans", "price", pricePublicId] as const,
  effective: (publicId: string, params: EffectivePriceParams | null) =>
    ["plans", "detail", publicId, "effective", params] as const,
};

export function usePlans(params: PlanListParams = {}) {
  return useQuery({
    queryKey: plansKeys.list(params),
    queryFn: () => fetchPlans(params),
  });
}

export function usePublicPlans(params: PublicPlanListParams = {}) {
  return useQuery({
    queryKey: plansKeys.publicList(params),
    queryFn: () => fetchPublicPlans(params),
  });
}

export function usePlan(publicId: string, params: PlanDetailParams = {}) {
  return useQuery({
    queryKey: plansKeys.detail(publicId, params),
    queryFn: () => fetchPlan(publicId, params),
    enabled: Boolean(publicId),
  });
}

export function useEffectivePlanPrice(publicId: string, params: EffectivePriceParams | null) {
  return useQuery({
    queryKey: plansKeys.effective(publicId, params),
    queryFn: () => {
      if (!params) throw new Error("Effective price params are required");
      return fetchEffectivePlanPrice(publicId, params);
    },
    enabled: Boolean(publicId && params?.currencyCode && params?.billingInterval),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: plansKeys.all });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: UpdatePlanInput }) =>
      updatePlan(publicId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: plansKeys.all });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: plansKeys.all });
    },
  });
}

export function usePlanPrices(publicId: string, params: PlanPriceListParams = {}) {
  return useQuery({
    queryKey: plansKeys.prices(publicId, params),
    queryFn: () => fetchPlanPrices(publicId, params),
    enabled: Boolean(publicId),
  });
}

export function usePlanPrice(pricePublicId: string) {
  return useQuery({
    queryKey: plansKeys.priceDetail(pricePublicId),
    queryFn: () => fetchPlanPrice(pricePublicId),
    enabled: Boolean(pricePublicId),
  });
}

export function useCreatePlanPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: CreatePlanPriceInput }) =>
      createPlanPrice(publicId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: plansKeys.all });
    },
  });
}

export function useUpdatePlanPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pricePublicId,
      input,
    }: {
      pricePublicId: string;
      input: UpdatePlanPriceInput;
    }) => updatePlanPrice(pricePublicId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: plansKeys.all });
    },
  });
}

export function useDeletePlanPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlanPrice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: plansKeys.all });
    },
  });
}
