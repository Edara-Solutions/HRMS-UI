import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

export const CONVERSION_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const SETUP_STEP_TYPES = [
  "SET_COMPANY_PROFILE",
  "SET_ROLES",
  "SET_JOBS",
  "SET_BRANCHES",
  "SET_SHIFTS",
  "SET_DEPARTMENTS",
] as const;

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const actorSchema = z.object({
  publicId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});
const leadSchema = z.object({
  publicId: z.string().uuid(),
  companyName: z.string().nullable(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  status: z.string(),
  isConverted: z.boolean(),
  isArchived: z.boolean(),
});
const contactSchema = z.object({
  publicId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  jobTitle: z.string().nullable(),
  isPrimary: z.boolean(),
});
const conversionPlanSchema = z.object({
  publicId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  duration: z.number().int().positive(),
  features: z.array(z.string()),
  limits: z.record(z.string(), z.number().int().nonnegative()).nullable(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
const companySchema = z.object({
  publicId: z.string().uuid(),
  name: z.string(),
  companyCode: z.string(),
});
const deliverySchema = z.object({
  publicId: z.string().uuid(),
  status: z.enum(["PENDING", "SUCCEEDED", "FAILED_RETRYABLE", "EXHAUSTED"]),
  attemptCount: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  lastError: z.string().nullable(),
  lastAttemptedAt: nullableTimestampSchema,
  deliveredAt: nullableTimestampSchema,
  exhaustedAt: nullableTimestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const conversionRequestSchema = z.object({
  publicId: z.string().uuid(),
  status: z.enum(CONVERSION_REQUEST_STATUSES),
  rejectionReason: z.string().nullable(),
  approvedAt: nullableTimestampSchema,
  rejectedAt: nullableTimestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  lead: leadSchema,
  primaryContact: contactSchema.nullable(),
  plan: conversionPlanSchema,
  requester: actorSchema,
  approvedBy: actorSchema.nullable(),
  rejectedBy: actorSchema.nullable(),
  company: companySchema.nullable(),
  ownerOnboardingDelivery: deliverySchema.nullable(),
});

const conversionRequestListSchema = z.object({
  items: z.array(conversionRequestSchema),
  meta: z.object({
    mode: z.string(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

const customSetupStepSchema = z.object({
  stepType: z.enum(SETUP_STEP_TYPES),
  isRequired: z.boolean(),
  sequence: z.number().int().positive(),
  dependencies: z.array(z.enum(SETUP_STEP_TYPES)),
});

const presetApprovalSchema = z.object({
  templateKey: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  trialEndDate: timestampSchema.optional(),
});

const customApprovalSchema = z.object({
  templateKey: z.literal(-1),
  setupSteps: z.array(customSetupStepSchema).min(1),
  trialEndDate: timestampSchema.optional(),
});

export const approvalInputSchema = z
  .union([presetApprovalSchema, customApprovalSchema])
  .superRefine((input, context) => {
    if (input.templateKey === -1) {
      const stepTypes = new Set<string>();
      const sequences = new Set<number>();
      for (const step of input.setupSteps) {
        if (stepTypes.has(step.stepType)) {
          context.addIssue({ code: "custom", message: "Setup step types must be unique." });
        }
        if (sequences.has(step.sequence)) {
          context.addIssue({ code: "custom", message: "Setup step sequences must be unique." });
        }
        stepTypes.add(step.stepType);
        sequences.add(step.sequence);
      }
    }

    if (input.trialEndDate && new Date(input.trialEndDate).getTime() <= Date.now()) {
      context.addIssue({
        code: "custom",
        path: ["trialEndDate"],
        message: "Trial end date must be in the future.",
      });
    }
  });

export const rejectionInputSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required.").max(1000),
});

export type ConversionRequest = z.infer<typeof conversionRequestSchema>;
export type ConversionRequestStatus = (typeof CONVERSION_REQUEST_STATUSES)[number];
export type ConversionRequestList = z.infer<typeof conversionRequestListSchema>;
export type SetupStepType = (typeof SETUP_STEP_TYPES)[number];
export type ApprovalInput = z.infer<typeof approvalInputSchema>;

export interface ConversionRequestListParams {
  status?: ConversionRequestStatus;
  page?: number;
  pageSize?: number;
}

export const conversionRequestKeys = {
  all: ["lead-conversion-requests"] as const,
  list: (params: ConversionRequestListParams) =>
    ["lead-conversion-requests", "list", params] as const,
  detail: (publicId: string) => ["lead-conversion-requests", "detail", publicId] as const,
};

function createSearchParams(params: ConversionRequestListParams) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  return searchParams;
}

async function fetchConversionRequests(
  params: ConversionRequestListParams,
): Promise<ConversionRequestList> {
  const response: unknown = await apiClient
    .get("lead-conversion-requests", { searchParams: createSearchParams(params) })
    .json();
  return conversionRequestListSchema.parse(response);
}

async function fetchConversionRequest(publicId: string): Promise<ConversionRequest> {
  const response: unknown = await apiClient.get(`lead-conversion-requests/${publicId}`).json();
  return conversionRequestSchema.parse(response);
}

async function changeConversionPlan(publicId: string, planPublicId: string) {
  const response: unknown = await apiClient
    .patch(`lead-conversion-requests/${publicId}/plan`, { json: { planPublicId } })
    .json();
  return conversionRequestSchema.parse(response);
}

async function approveConversionRequest(publicId: string, input: ApprovalInput) {
  const response: unknown = await apiClient
    .post(`lead-conversion-requests/${publicId}/approve`, { json: input })
    .json();
  return conversionRequestSchema.parse(response);
}

async function rejectConversionRequest(publicId: string, reason: string) {
  const response: unknown = await apiClient
    .post(`lead-conversion-requests/${publicId}/reject`, { json: { reason } })
    .json();
  return conversionRequestSchema.parse(response);
}

function useRequestInvalidation() {
  const queryClient = useQueryClient();
  return async (publicId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: conversionRequestKeys.all }),
      queryClient.invalidateQueries({ queryKey: conversionRequestKeys.detail(publicId) }),
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["companies"] }),
    ]);
  };
}

export function useConversionRequests(params: ConversionRequestListParams) {
  return useQuery({
    queryKey: conversionRequestKeys.list(params),
    queryFn: () => fetchConversionRequests(params),
  });
}

export function useConversionRequest(publicId: string) {
  return useQuery({
    queryKey: conversionRequestKeys.detail(publicId),
    queryFn: () => fetchConversionRequest(publicId),
    enabled: Boolean(publicId),
  });
}

export function useChangeConversionPlan() {
  const invalidate = useRequestInvalidation();
  return useMutation({
    mutationFn: ({ publicId, planPublicId }: { publicId: string; planPublicId: string }) =>
      changeConversionPlan(publicId, planPublicId),
    onSettled: (_data, _error, input) => invalidate(input.publicId),
  });
}

export function useApproveConversionRequest() {
  const queryClient = useQueryClient();
  const invalidate = useRequestInvalidation();
  return useMutation({
    mutationFn: ({ publicId, input }: { publicId: string; input: ApprovalInput }) =>
      approveConversionRequest(publicId, input),
    onSuccess: () => queryClient.invalidateQueries(),
    onSettled: (_data, _error, input) => invalidate(input.publicId),
  });
}

export function useRejectConversionRequest() {
  const invalidate = useRequestInvalidation();
  return useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) =>
      rejectConversionRequest(publicId, reason),
    onSettled: (_data, _error, input) => invalidate(input.publicId),
  });
}
