import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  ContractViolation,
  platformCommunicationsOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
} from "@/shared/api";
export type DeliveryRecord = z.output<(typeof operations.delivery.responses)["200"]>;
export type DeliveryListResponse = z.output<(typeof operations.deliveries.responses)["200"]>;
export type DeliveryStatus = DeliveryRecord["status"];
export type EmailContext = DeliveryRecord["context"];
export type DeliveryFilters = z.input<typeof operations.deliveries.requestSchema>["query"];
export function deliveriesQuery(identity: string, query: DeliveryFilters) {
  return queryOptions({
    queryKey: platformQueryKey(identity, operations.deliveries, JSON.stringify(query)),
    queryFn: ({ signal }) => requestPlatformOperation(operations.deliveries, { query }, signal),
  });
}
export async function readDelivery(context: EmailContext, publicId: string, signal?: AbortSignal) {
  const result = await requestPlatformOperation(
    operations.delivery,
    { params: { context, publicId } },
    signal,
  );
  if (result.context !== context || result.publicId !== publicId)
    throw new ContractViolation({
      audience: "platform",
      key: operations.delivery.key,
      status: 200,
      phase: "response",
    });
  return result;
}
export function deliveryQuery(identity: string, context: EmailContext, publicId: string) {
  return queryOptions({
    queryKey: platformQueryKey(identity, operations.delivery, context, publicId),
    queryFn: ({ signal }) => readDelivery(context, publicId, signal),
  });
}
export async function changeDelivery(
  action: "retry" | "cancel",
  target: DeliveryRecord,
  reason: string,
  check: () => void,
) {
  const fresh = await readDelivery(target.context, target.publicId);
  if (
    fresh.status !== target.status ||
    fresh.attempts !== target.attempts ||
    (action === "retry"
      ? fresh.status !== "FAILED"
      : fresh.status !== "QUEUED" && fresh.status !== "RETRY_SCHEDULED")
  )
    throw new Error("stale");
  check();
  const operation = action === "retry" ? operations.retryDelivery : operations.cancelDelivery;
  const result = await requestPlatformOperation(operation, {
    params: { context: target.context, publicId: target.publicId },
    body: { reason },
  });
  if (result.context !== target.context || result.publicId !== target.publicId)
    throw new ContractViolation({
      audience: "platform",
      key: operation.key,
      status: 200,
      phase: "response",
    });
  return result;
}
