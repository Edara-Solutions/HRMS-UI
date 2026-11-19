import { ContractViolation, OperationRefusal } from "@/shared/api";

export const FAILURE_KINDS = new Set([
  "RENDER",
  "RECIPIENT",
  "SMTP_TRANSIENT",
  "SMTP_PERMANENT",
  "AUTH",
  "CONFIG",
  "POLICY",
]);

export const failureKey = (kind: string) =>
  FAILURE_KINDS.has(kind) ? `failure.${kind}` : "failure.unknown";

export type ReadFailure = "contract" | "restricted" | "unavailable";

export function readFailure(error: unknown): ReadFailure {
  if (error instanceof ContractViolation) return "contract";
  if (error instanceof OperationRefusal && (error.status === 403 || error.status === 404))
    return "restricted";
  return "unavailable";
}
