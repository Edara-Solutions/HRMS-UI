import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

const timestampSchema = z.string().datetime({ offset: true });

export const accessPolicyModeValues = [
  "NORMAL",
  "READ_ONLY",
  "FROZEN",
  "BLOCKED",
  "MAINTENANCE",
] as const;

export const subscriptionStatusValues = [
  "TRIAL",
  "ACTIVE",
  "FROZEN",
  "CANCELLED",
  "EXPIRED",
] as const;

export const subscriptionHistoryTypeValues = [
  "TRIAL_STARTED",
  "TRIAL_EXTENDED",
  "TRIAL_EXPIRED",
] as const;

export const activationRequirementCodeValues = [
  "OWNER_ONBOARDING_INCOMPLETE",
  "COMPANY_PROFILE_INCOMPLETE",
  "REQUIRED_SETUP_INCOMPLETE",
  "ACCESS_POLICY_RESTRICTS_ACTIVATION",
  "SUBSCRIPTION_NOT_ACTIVATABLE",
] as const;

const subscriptionPlanSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  duration: z.number(),
});

const companySubscriptionSchema = z.object({
  publicId: z.string(),
  companyPublicId: z.string(),
  plan: subscriptionPlanSchema,
  status: z.enum(subscriptionStatusValues),
  startDate: timestampSchema,
  endDate: timestampSchema.nullable(),
  initialTrialEndDate: timestampSchema,
  trialEndDate: timestampSchema,
  note: z.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const companySubscriptionHistoryItemSchema = z.object({
  publicId: z.string(),
  type: z.enum(subscriptionHistoryTypeValues),
  plan: subscriptionPlanSchema,
  oldStatus: z.enum(subscriptionStatusValues).nullable(),
  newStatus: z.enum(subscriptionStatusValues),
  oldTrialEndDate: timestampSchema.nullable(),
  newTrialEndDate: timestampSchema,
  actorUserId: z.number().nullable(),
  reason: z.string().nullable(),
  occurredAt: timestampSchema,
});

export const companySubscriptionStateSchema = z.object({
  subscription: companySubscriptionSchema,
  history: z.array(companySubscriptionHistoryItemSchema),
});

const storedAccessPolicySchema = z.object({
  publicId: z.string().nullable(),
  companyPublicId: z.string(),
  mode: z.enum(accessPolicyModeValues),
  reason: z.string().nullable(),
  note: z.string().nullable(),
  effectiveFrom: timestampSchema.nullable(),
  effectiveUntil: timestampSchema.nullable(),
  changedByUserId: z.number().nullable(),
  createdAt: timestampSchema.nullable(),
  updatedAt: timestampSchema.nullable(),
  source: z.enum(["policy", "legacy_site_status", "default"]),
});

export const companyAccessPolicyStateSchema = z.object({
  policy: storedAccessPolicySchema,
  effectiveMode: z.enum(accessPolicyModeValues),
  effectiveAt: timestampSchema,
  isCurrentlyEffective: z.boolean(),
  isExpired: z.boolean(),
  legacyMapping: z.string().nullable(),
});

export const companyActivationStateSchema = z.object({
  companyPublicId: z.string(),
  lifecycleStatus: z.enum(["ONBOARDING", "ACTIVE", "SUSPENDED", "CLOSED"]),
  activatedAt: timestampSchema.nullable(),
  canActivate: z.boolean(),
  unmetRequirements: z.array(
    z.object({
      code: z.enum(activationRequirementCodeValues),
      message: z.string(),
      details: z.record(z.string(), z.unknown()),
    }),
  ),
});

export type AccessPolicyMode = (typeof accessPolicyModeValues)[number];
export type CompanySubscriptionState = z.infer<typeof companySubscriptionStateSchema>;
export type CompanyAccessPolicyState = z.infer<typeof companyAccessPolicyStateSchema>;
export type CompanyActivationState = z.infer<typeof companyActivationStateSchema>;

export interface ExtendTrialInput {
  trialEndDate: string;
  reason: string;
}

export interface UpdateAccessPolicyInput {
  mode: AccessPolicyMode;
  reason: string;
  note?: string | null;
  effectiveFrom: string;
  effectiveUntil?: string | null;
}

export const companyActivationRepairKeys = {
  subscription: (companyPublicId: string) =>
    ["admin-company-subscription", companyPublicId] as const,
  accessPolicy: (companyPublicId: string) =>
    ["admin-company-access-policy", companyPublicId] as const,
  activation: (companyPublicId: string) => ["admin-company-activation", companyPublicId] as const,
};

async function fetchCompanySubscription(
  companyPublicId: string,
): Promise<CompanySubscriptionState> {
  const response: unknown = await apiClient.get(`companies/${companyPublicId}/subscription`).json();
  return companySubscriptionStateSchema.parse(response);
}

async function fetchCompanyAccessPolicy(
  companyPublicId: string,
): Promise<CompanyAccessPolicyState> {
  const response: unknown = await apiClient
    .get(`companies/${companyPublicId}/access-policy`)
    .json();
  return companyAccessPolicyStateSchema.parse(response);
}

async function fetchCompanyActivation(companyPublicId: string): Promise<CompanyActivationState> {
  const response: unknown = await apiClient.get(`companies/${companyPublicId}/activation`).json();
  return companyActivationStateSchema.parse(response);
}

async function extendTrial({
  companyPublicId,
  input,
}: {
  companyPublicId: string;
  input: ExtendTrialInput;
}): Promise<CompanySubscriptionState> {
  const response: unknown = await apiClient
    .patch(`companies/${companyPublicId}/subscription/trial`, { json: input })
    .json();
  return companySubscriptionStateSchema.parse(response);
}

async function updateAccessPolicy({
  companyPublicId,
  input,
}: {
  companyPublicId: string;
  input: UpdateAccessPolicyInput;
}): Promise<CompanyAccessPolicyState["policy"]> {
  const response: unknown = await apiClient
    .patch(`companies/${companyPublicId}/access-policy`, { json: input })
    .json();
  return storedAccessPolicySchema.parse(response);
}

function useInvalidateRepairState() {
  const queryClient = useQueryClient();

  return async (companyPublicId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: companyActivationRepairKeys.subscription(companyPublicId),
      }),
      queryClient.invalidateQueries({
        queryKey: companyActivationRepairKeys.accessPolicy(companyPublicId),
      }),
      queryClient.invalidateQueries({
        queryKey: companyActivationRepairKeys.activation(companyPublicId),
      }),
    ]);
  };
}

export function useCompanySubscription(companyPublicId: string) {
  return useQuery({
    queryKey: companyActivationRepairKeys.subscription(companyPublicId),
    queryFn: () => fetchCompanySubscription(companyPublicId),
    enabled: Boolean(companyPublicId),
  });
}

export function useCompanyAccessPolicy(companyPublicId: string) {
  return useQuery({
    queryKey: companyActivationRepairKeys.accessPolicy(companyPublicId),
    queryFn: () => fetchCompanyAccessPolicy(companyPublicId),
    enabled: Boolean(companyPublicId),
  });
}

export function useCompanyActivation(companyPublicId: string) {
  return useQuery({
    queryKey: companyActivationRepairKeys.activation(companyPublicId),
    queryFn: () => fetchCompanyActivation(companyPublicId),
    enabled: Boolean(companyPublicId),
    retry: false,
  });
}

export function useExtendCompanyTrial() {
  const queryClient = useQueryClient();
  const invalidateRepairState = useInvalidateRepairState();

  return useMutation({
    mutationFn: extendTrial,
    retry: false,
    onSuccess: async (state, variables) => {
      queryClient.setQueryData(
        companyActivationRepairKeys.subscription(variables.companyPublicId),
        state,
      );
      await invalidateRepairState(variables.companyPublicId);
    },
    onError: async (_error, variables) => {
      await invalidateRepairState(variables.companyPublicId);
    },
  });
}

export function useUpdateCompanyAccessPolicy() {
  const queryClient = useQueryClient();
  const invalidateRepairState = useInvalidateRepairState();

  return useMutation({
    mutationFn: updateAccessPolicy,
    retry: false,
    onSuccess: async (_policy, variables) => {
      await queryClient.invalidateQueries({
        queryKey: companyActivationRepairKeys.accessPolicy(variables.companyPublicId),
      });
      await queryClient.invalidateQueries({
        queryKey: companyActivationRepairKeys.activation(variables.companyPublicId),
      });
    },
    onError: async (_error, variables) => {
      await invalidateRepairState(variables.companyPublicId);
    },
  });
}
