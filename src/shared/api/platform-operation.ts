import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  type AudienceCommand,
  type AudienceOperation,
  requestAudienceOperation,
  sendAudienceCommand,
} from "./audience-operation";

/** A Platform operation whose declared success (200, 201 or 202) carries a body. */
export function requestPlatformOperation<Success extends z.ZodTypeAny>(
  operation: AudienceOperation<Success>,
  input: unknown,
  signal?: AbortSignal,
): Promise<z.output<Success>> {
  return requestAudienceOperation("platform", operation, input, signal);
}

/** A Platform command whose declared success is a bodyless 204. */
export function sendPlatformCommand(operation: AudienceCommand, input: unknown): Promise<void> {
  return sendAudienceCommand("platform", operation, input);
}

/** Cache root for Platform data: audience + Platform User, then the operation and its public inputs. */
export function platformQueryKey(
  userPublicId: string,
  operation: { key: string },
  ...inputs: readonly (string | number)[]
) {
  return ["platform", userPublicId, operation.key, ...inputs] as const;
}

/** A parameterless Platform read keyed under the live identity's cache root. */
export function platformReadQuery<Success extends z.ZodTypeAny>(
  userPublicId: string,
  operation: AudienceOperation<Success>,
) {
  return queryOptions({
    queryKey: platformQueryKey(userPublicId, operation),
    queryFn: ({ signal }) => requestPlatformOperation(operation, {}, signal),
  });
}
