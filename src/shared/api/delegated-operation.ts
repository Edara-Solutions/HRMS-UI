import type { z } from "zod";
import {
  type AudienceCommand,
  type AudienceOperation,
  requestAudienceOperation,
  sendAudienceCommand,
} from "./audience-operation";

export function requestDelegatedOperation<Success extends z.ZodTypeAny>(
  operation: AudienceOperation<Success>,
  input: unknown,
  signal?: AbortSignal,
): Promise<z.output<Success>> {
  return requestAudienceOperation("delegated", operation, input, signal);
}

export function sendDelegatedCommand(operation: AudienceCommand, input: unknown): Promise<void> {
  return sendAudienceCommand("delegated", operation, input);
}

export function delegatedQueryKey(
  userPublicId: string,
  sessionPublicId: string,
  operation?: { key: string },
  ...inputs: readonly (string | number)[]
) {
  const root = ["platform-delegated", userPublicId, sessionPublicId] as const;
  return operation ? ([...root, operation.key, ...inputs] as const) : root;
}
