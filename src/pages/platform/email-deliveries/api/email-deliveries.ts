import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient, type components } from "@/shared/api";
import { type DateEdgeValue, serializeDateEdgeValue } from "@/shared/lib/date-edge";

export type DeliveryCompanySummary = {
  publicId: string;
  name: string;
  code: string;
};

export type DeliveryRecord = Omit<
  components["schemas"]["DeliveryRecordResponse"],
  "senderName" | "senderAddress" | "company"
> & {
  senderName: string | null;
  senderAddress: string | null;
  company: DeliveryCompanySummary | null;
};
export type DeliveryListResponse = Omit<components["schemas"]["DeliveryListResponse"], "items"> & {
  items: DeliveryRecord[];
};
export type DeliveryStatus = components["schemas"]["DeliveryStatus"];
export type EmailContext = components["schemas"]["EmailContext"];

export interface DeliveryListParams {
  companyPublicId?: string;
  context?: EmailContext;
  emailTypeKey?: string;
  recipientEmail?: string;
  status?: DeliveryStatus;
  createdFrom?: DateEdgeValue;
  createdTo?: DateEdgeValue;
  page: number;
  pageSize: number;
}

export interface DeliveryActionInput {
  publicId: string;
  reason: string;
}

const DELIVERY_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "RETRY_SCHEDULED",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const satisfies readonly DeliveryStatus[];
const EMAIL_CONTEXTS = ["EDARA", "COMPANY"] as const satisfies readonly EmailContext[];
const LOCALE_SOURCES = ["EVENT", "RECIPIENT", "CONTEXT_DEFAULT", "SYSTEM_FALLBACK"] as const;
const TIME_ZONE_SOURCES = ["RECIPIENT", "CONTEXT_DEFAULT", "SYSTEM_FALLBACK"] as const;
const ACTIVE_DELIVERY_STATUSES = new Set<DeliveryStatus>([
  "QUEUED",
  "PROCESSING",
  "RETRY_SCHEDULED",
]);
const TIMELINE_STAGES = [
  "ENQUEUED",
  "SENT",
  "RETRY_SCHEDULED",
  "FAILED",
  "RETRY_REQUESTED",
  "CANCELLED",
] as const;

const DELIVERY_TIMELINE_ENTRY_SCHEMA = z.object({
  stage: z.enum(TIMELINE_STAGES),
  occurredAt: z.string().datetime(),
  attemptNumber: z.number().int().optional(),
  failureKind: z.string().optional(),
  reason: z.string().optional(),
  providerMessageId: z.string().optional(),
  actorUserId: z.number().int().nullable().optional(),
});

const DELIVERY_RECORD_SCHEMA: z.ZodType<DeliveryRecord> = z.object({
  publicId: z.string().uuid(),
  emailTypeKey: z.string().min(1),
  context: z.enum(EMAIL_CONTEXTS),
  locale: z.enum(["en", "ar"]),
  localeSource: z.enum(LOCALE_SOURCES),
  localeFallbackApplied: z.boolean(),
  timeZone: z.string().min(1),
  timeZoneSource: z.enum(TIME_ZONE_SOURCES),
  timeZoneFallbackApplied: z.boolean(),
  status: z.enum(DELIVERY_STATUSES),
  isTest: z.boolean(),
  maskedRecipient: z.string().min(1),
  senderName: z.string().min(1).nullable(),
  senderAddress: z.string().email().nullable(),
  templateRevisionKey: z.string().min(1),
  attempts: z.number().int().nonnegative(),
  lastFailureKind: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  companyId: z.number().int().nullable(),
  company: z
    .object({
      publicId: z.string().uuid(),
      name: z.string().min(1),
      code: z.string().min(1),
    })
    .nullable(),
  businessReference: z.string().min(1),
  createdAt: z.string().datetime(),
  sentAt: z.string().datetime().nullable(),
  timeline: z.array(DELIVERY_TIMELINE_ENTRY_SCHEMA).optional(),
});

const DELIVERY_LIST_SCHEMA: z.ZodType<DeliveryListResponse> = z.object({
  items: z.array(DELIVERY_RECORD_SCHEMA),
  meta: z.object({
    mode: z.literal("page"),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

const DELIVERY_QUERY_KEYS = {
  list: (params: DeliveryListParams) => ["email-deliveries", "list", params] as const,
  detail: (publicId: string) => ["email-deliveries", "detail", publicId] as const,
};

function isAwaitingWorker(status: DeliveryStatus): boolean {
  return ACTIVE_DELIVERY_STATUSES.has(status);
}

function deliverySearchParams(params: DeliveryListParams): URLSearchParams {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.companyPublicId) searchParams.set("companyPublicId", params.companyPublicId);
  if (params.context) searchParams.set("context", params.context);
  if (params.emailTypeKey) searchParams.set("emailTypeKey", params.emailTypeKey);
  if (params.recipientEmail) searchParams.set("recipientEmail", params.recipientEmail);
  if (params.status) searchParams.set("status", params.status);
  const createdFrom = serializeDateEdgeValue(params.createdFrom);
  const createdTo = serializeDateEdgeValue(params.createdTo);
  if (createdFrom) searchParams.set("createdFrom", createdFrom);
  if (createdTo) searchParams.set("createdTo", createdTo);
  return searchParams;
}

async function fetchDeliveries(params: DeliveryListParams): Promise<DeliveryListResponse> {
  const response = await apiClient
    .get("emails/deliveries", { searchParams: deliverySearchParams(params) })
    .json<unknown>();
  return DELIVERY_LIST_SCHEMA.parse(response);
}

async function fetchDelivery(publicId: string): Promise<DeliveryRecord> {
  const response = await apiClient.get(`emails/deliveries/${publicId}`).json<unknown>();
  return DELIVERY_RECORD_SCHEMA.parse(response);
}

async function updateDelivery(
  action: "retry" | "cancel",
  input: DeliveryActionInput,
): Promise<DeliveryRecord> {
  const response = await apiClient
    .post(`emails/deliveries/${input.publicId}/${action}`, { json: { reason: input.reason } })
    .json<unknown>();
  return DELIVERY_RECORD_SCHEMA.parse(response);
}

/** Loads a server-filtered, stable page of safe delivery metadata. */
export function useEmailDeliveries(params: DeliveryListParams) {
  return useQuery({
    queryKey: DELIVERY_QUERY_KEYS.list(params),
    queryFn: () => fetchDeliveries(params),
    // Delivery history is an operator-facing screen: unexpected retries multiply failed
    // requests and obscure the state the operator is trying to inspect. Recovery is explicit.
    retry: false,
    retryOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      query.state.data?.items.some((delivery) => isAwaitingWorker(delivery.status)) ? 2_000 : false,
  });
}

/** Loads the safe operational timeline for one selected delivery. */
export function useEmailDelivery(publicId: string | undefined) {
  return useQuery({
    queryKey: DELIVERY_QUERY_KEYS.detail(publicId ?? ""),
    queryFn: () => {
      if (!publicId) throw new Error("Delivery public id is required");
      return fetchDelivery(publicId);
    },
    enabled: publicId !== undefined,
    refetchInterval: (query) =>
      query.state.data && isAwaitingWorker(query.state.data.status) ? 2_000 : false,
  });
}

function useDeliveryAction(action: "retry" | "cancel") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeliveryActionInput) => updateDelivery(action, input),
    onSuccess: async (delivery) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["email-deliveries", "list"] }),
        queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.detail(delivery.publicId) }),
      ]);
    },
  });
}

/** Requests an audited manual retry for a terminal failure. */
export function useRetryEmailDelivery() {
  return useDeliveryAction("retry");
}

/** Requests an audited cancellation before a message is sent. */
export function useCancelEmailDelivery() {
  return useDeliveryAction("cancel");
}
