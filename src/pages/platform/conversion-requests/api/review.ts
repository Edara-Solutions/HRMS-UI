import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  ContractViolation,
  platformLeadOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
} from "@/shared/api";
import { serializeDateEdgeValue } from "@/shared/lib/date-edge";
import type { RequestSearch } from "../model/page-search";
export type ConversionRequest = z.output<(typeof operations.request.responses)[200]>;
export type Delivery = NonNullable<z.output<(typeof operations.delivery.responses)[200]>>;
export type ReviewCommand =
  | { kind: "approve" | "reject" | "changePlan"; body: unknown }
  | { kind: "retryDelivery"; deliveryPublicId: string };
function scoped(value: ConversionRequest, publicId: string) {
  if (value.publicId !== publicId)
    throw new ContractViolation({
      audience: "platform",
      key: operations.request.key,
      phase: "response",
      status: 200,
    });
  return value;
}
export function canApprove(value: ConversionRequest) {
  return (
    value.status === "PENDING" &&
    value.plan.isActive &&
    !value.lead.isConverted &&
    !value.lead.isArchived &&
    [
      "QUALIFIED",
      "DEMO_SCHEDULED",
      "WAITING_QUOTATION",
      "QUOTATION_SENT",
      "TRIAL_STARTED",
      "NEGOTIATION",
    ].includes(value.lead.status) &&
    !!value.primaryContact?.name?.trim() &&
    !!value.primaryContact?.email?.trim()
  );
}
export function canRetry(value: ConversionRequest, delivery: Delivery | null | undefined) {
  return (
    value.status === "APPROVED" &&
    !!value.company &&
    !!delivery &&
    value.ownerOnboardingDelivery?.publicId === delivery.publicId &&
    delivery.status === "FAILED_RETRYABLE" &&
    delivery.attemptCount < delivery.maxAttempts
  );
}
export function requestListQuery(userPublicId: string, search: RequestSearch) {
  const { createdFrom, createdTo, ...rest } = search;
  const query = {
    ...rest,
    ...(createdFrom ? { createdFrom: serializeDateEdgeValue(createdFrom) } : {}),
    ...(createdTo ? { createdTo: serializeDateEdgeValue(createdTo) } : {}),
  };
  return queryOptions({
    queryKey: platformQueryKey(userPublicId, operations.requests, JSON.stringify(query)),
    queryFn: ({ signal }) => requestPlatformOperation(operations.requests, { query }, signal),
    select: (value) => ({
      meta: value.meta,
      items: value.items.map(({ publicId, status, lead, plan, createdAt }) => ({
        publicId,
        status,
        name: lead.companyName,
        plan: plan.name,
        createdAt,
      })),
    }),
  });
}
export function requestDetailQuery(userPublicId: string, publicId: string) {
  return queryOptions({
    queryKey: platformQueryKey(userPublicId, operations.request, publicId),
    queryFn: async ({ signal }) =>
      scoped(
        await requestPlatformOperation(operations.request, { params: { publicId } }, signal),
        publicId,
      ),
  });
}
export function deliveryQuery(
  userPublicId: string,
  publicId: string,
  originalId: string | undefined,
) {
  return queryOptions({
    queryKey: platformQueryKey(
      userPublicId,
      operations.delivery,
      publicId,
      originalId ?? "withheld",
    ),
    queryFn: async ({ signal }) => {
      const value = await requestPlatformOperation(
        operations.delivery,
        { params: { publicId } },
        signal,
      );
      if (value && value.publicId !== originalId)
        throw new ContractViolation({
          audience: "platform",
          key: operations.delivery.key,
          phase: "response",
          status: 200,
        });
      return value;
    },
  });
}
/** Recheck the committed request before every transition; retries never accept a new recipient. */
export async function runReviewCommand(publicId: string, command: ReviewCommand) {
  const current = scoped(
    await requestPlatformOperation(operations.request, { params: { publicId } }),
    publicId,
  );
  if (command.kind === "retryDelivery") {
    const delivery = await requestPlatformOperation(operations.delivery, { params: { publicId } });
    if (!canRetry(current, delivery) || delivery?.publicId !== command.deliveryPublicId)
      throw new Error("Delivery changed");
    const result = await requestPlatformOperation(operations.retryDelivery, {
      params: { publicId },
    });
    if (result && result.publicId !== command.deliveryPublicId)
      throw new ContractViolation({
        audience: "platform",
        key: operations.retryDelivery.key,
        phase: "response",
        status: 200,
      });
    return;
  }
  if (current.status !== "PENDING" || (command.kind === "approve" && !canApprove(current)))
    throw new Error("Request changed");
  const input = { params: { publicId }, body: command.body };
  const result =
    command.kind === "approve"
      ? await requestPlatformOperation(operations.approve, input)
      : command.kind === "reject"
        ? await requestPlatformOperation(operations.reject, input)
        : await requestPlatformOperation(operations.changePlan, input);
  scoped(result, publicId);
}
