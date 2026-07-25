import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

const conversionRequestSchema = z.object({
  publicId: z.string().uuid(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  lead: z.object({ publicId: z.string().min(1) }),
  plan: z.object({ publicId: z.string().uuid(), name: z.string().min(1) }),
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

export type LeadConversionRequest = z.infer<typeof conversionRequestSchema>;

export interface SubmitPendingConversionInput {
  leadPublicId: string;
  planPublicId: string;
}

export interface SubmitImmediateConversionInput extends SubmitPendingConversionInput {
  templateKey: 1 | 2 | 3;
  trialEndDate?: string;
}

async function submitPendingConversion(
  input: SubmitPendingConversionInput,
): Promise<LeadConversionRequest> {
  const response: unknown = await apiClient
    .post("lead-conversion-requests", { json: input })
    .json();
  return conversionRequestSchema.parse(response);
}

async function submitImmediateConversion(
  input: SubmitImmediateConversionInput,
): Promise<LeadConversionRequest> {
  const response: unknown = await apiClient
    .post("lead-conversion-requests/immediate", { json: input })
    .json();
  return conversionRequestSchema.parse(response);
}

export async function findPendingConversionRequest(
  leadPublicId: string,
): Promise<LeadConversionRequest | null> {
  const response: unknown = await apiClient
    .get("lead-conversion-requests", {
      searchParams: { status: "PENDING", page: 1, pageSize: 100 },
    })
    .json();
  const result = conversionRequestListSchema.parse(response);
  return result.items.find((request) => request.lead.publicId === leadPublicId) ?? null;
}

function useConversionInvalidation() {
  const queryClient = useQueryClient();
  return async (leadPublicId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lead-conversion-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({
        queryKey: ["leads", leadPublicId, "conversion-eligibility"],
      }),
    ]);
  };
}

export function useSubmitPendingConversion() {
  const invalidate = useConversionInvalidation();
  return useMutation({
    mutationFn: submitPendingConversion,
    onSettled: (_data, _error, input) => invalidate(input.leadPublicId),
  });
}

export function useSubmitImmediateConversion() {
  const invalidate = useConversionInvalidation();
  return useMutation({
    mutationFn: submitImmediateConversion,
    onSettled: (_data, _error, input) => invalidate(input.leadPublicId),
  });
}
