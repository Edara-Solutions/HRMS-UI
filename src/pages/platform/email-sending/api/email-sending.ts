import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  ContractViolation,
  platformCommunicationsOperations as operations,
  platformReadQuery,
  requestPlatformOperation,
} from "@/shared/api";
export type SendingContextStatus = z.output<(typeof operations.pauseSending.responses)["200"]>;
export type EmailContext = SendingContextStatus["context"];
export function sendingQuery(identity: string) {
  return queryOptions({
    ...platformReadQuery(identity, operations.sendingStatus),
    queryFn: async ({ signal }) => {
      const result = await requestPlatformOperation(operations.sendingStatus, {}, signal);
      const contexts = new Set(result.items.map((item) => item.context));
      if (contexts.size !== result.items.length)
        throw new ContractViolation({
          audience: "platform",
          key: operations.sendingStatus.key,
          status: 200,
          phase: "response",
        });
      return result;
    },
  });
}
export async function changeSending(
  target: SendingContextStatus,
  reason: string,
  check: () => void,
) {
  const current = await requestPlatformOperation(operations.sendingStatus, {});
  const matches = current.items.filter((item) => item.context === target.context);
  const fresh = matches.length === 1 ? matches[0] : undefined;
  if (!fresh || fresh.paused !== target.paused || fresh.updatedAt !== target.updatedAt)
    throw new Error("stale");
  check();
  const operation = target.paused ? operations.resumeSending : operations.pauseSending;
  const result = target.paused
    ? await requestPlatformOperation(operations.resumeSending, {
        params: { context: target.context },
      })
    : await requestPlatformOperation(operations.pauseSending, {
        params: { context: target.context },
        body: { reason },
      });
  if (result.context !== target.context || result.paused === target.paused)
    throw new ContractViolation({
      audience: "platform",
      key: operation.key,
      status: 200,
      phase: "response",
    });
  return result;
}
