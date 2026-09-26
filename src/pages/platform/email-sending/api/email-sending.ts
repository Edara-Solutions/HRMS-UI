import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/shared/api";

export type EmailContext = "EDARA" | "COMPANY";

const EMAIL_CONTEXTS = ["EDARA", "COMPANY"] as const satisfies readonly EmailContext[];

/** The emergency-pause state of one communication context (backend PRD story 110). */
const SENDING_CONTEXT_STATUS_SCHEMA = z.object({
  context: z.enum(EMAIL_CONTEXTS),
  paused: z.boolean(),
  reason: z.string().nullable(),
  updatedBy: z.number().int().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

const SENDING_STATUS_SCHEMA = z.object({
  items: z.array(SENDING_CONTEXT_STATUS_SCHEMA),
});

// The runtime schema is the single source of truth; the static types are derived from it so the two
// can never drift (FRONTEND.md — the boundary is Zod).
export type SendingContextStatus = z.infer<typeof SENDING_CONTEXT_STATUS_SCHEMA>;
export type SendingStatusResponse = z.infer<typeof SENDING_STATUS_SCHEMA>;

export interface PauseSendingInput {
  context: EmailContext;
  reason: string;
}

const SENDING_STATUS_QUERY_KEY = ["email-sending", "status"] as const;

async function fetchSendingStatus(): Promise<SendingStatusResponse> {
  const response = await apiClient.get("emails/sending").json<unknown>();
  return SENDING_STATUS_SCHEMA.parse(response);
}

async function pauseSending({ context, reason }: PauseSendingInput): Promise<SendingContextStatus> {
  const response = await apiClient
    .post(`emails/sending/${context}/pause`, { json: { reason } })
    .json<unknown>();
  return SENDING_CONTEXT_STATUS_SCHEMA.parse(response);
}

async function resumeSending(context: EmailContext): Promise<SendingContextStatus> {
  // Resume takes no payload, but the shared client always sends `Content-Type: application/json`, and
  // Fastify rejects that with an empty body. An empty JSON object satisfies both sides.
  const response = await apiClient
    .post(`emails/sending/${context}/resume`, { json: {} })
    .json<unknown>();
  return SENDING_CONTEXT_STATUS_SCHEMA.parse(response);
}

/** Loads the current emergency-pause status of both communication contexts. */
export function useSendingStatus() {
  return useQuery({
    queryKey: SENDING_STATUS_QUERY_KEY,
    queryFn: fetchSendingStatus,
    // An incident-response screen: an operator recovers from a failed request explicitly rather than
    // watching silent retries obscure the switch they are trying to read.
    retry: false,
    retryOnMount: false,
    refetchOnReconnect: false,
  });
}

function useSendingMutation<TInput>(mutationFn: (input: TInput) => Promise<SendingContextStatus>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SENDING_STATUS_QUERY_KEY }),
  });
}

/** Emergency-pauses one context with a required, audited reason. */
export function usePauseSending() {
  return useSendingMutation(pauseSending);
}

/** Resumes one paused context after an incident is contained. */
export function useResumeSending() {
  return useSendingMutation(resumeSending);
}
