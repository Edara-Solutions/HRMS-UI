import type { z } from "zod";
import { ContractViolation, type delegatedCompanyOperations, OperationRefusal } from "@/shared/api";

type Operations = typeof delegatedCompanyOperations;
export type DiagnosticCommand = z.input<Operations["diagnosticSend"]["requestSchema"]>["body"];
export type DiagnosticReceipt = z.output<Operations["diagnosticResult"]["responses"]["200"]>;
export const diagnosticTypes = [
  "employee-invitation",
  "company-user-recovery",
  "company-user-password-reset",
] as const;
export type DiagnosticType = (typeof diagnosticTypes)[number];

export function isDiagnosticType(key: string): key is DiagnosticType {
  return diagnosticTypes.some((type) => type === key);
}

export type DiagnosticPhase =
  | "idle"
  | "confirming"
  | "pending"
  | "unknown"
  | "accepted"
  | "refused"
  | "conflict"
  | "contract";
export interface DiagnosticState {
  phase: DiagnosticPhase;
  command?: DiagnosticCommand;
  receipt?: DiagnosticReceipt;
  message?: string;
  retryAt?: number;
  reconciled?: boolean;
  sendUnavailable?: true;
  resultUnavailable?: true;
}

export function receiptMatches(command: DiagnosticCommand, receipt: DiagnosticReceipt) {
  return (
    receipt.requestId === command.requestId &&
    receipt.emailTypeKey === command.emailTypeKey &&
    receipt.locale === command.locale
  );
}

export function diagnosticFailure(
  error: unknown,
  command: DiagnosticCommand,
  now: number,
): DiagnosticState {
  if (error instanceof ContractViolation && error.phase === "status" && (error.status ?? 0) >= 500)
    return { phase: "unknown", command, message: "unknown" };
  if (error instanceof ContractViolation)
    return { phase: "contract", command, message: "contract" };
  if (!(error instanceof OperationRefusal) || error.status >= 500)
    return { phase: "unknown", command, message: "unknown" };
  if (error.code === "DIAGNOSTIC_REQUEST_CONFLICT")
    return { phase: "conflict", command, message: "conflict" };
  if (error.status === 429)
    return {
      phase: "refused",
      command,
      message: "limited",
      retryAt: now + (error.retryAfterSeconds ?? 600) * 1000,
    };
  const message =
    error.code === "EMAIL_DIAGNOSTIC_NOT_READY"
      ? "notReady"
      : error.status === 422
        ? "unprocessable"
        : "refused";
  return { phase: "refused", command, message };
}

export function replayAllowed(state: DiagnosticState, now: number) {
  return (
    !state.sendUnavailable &&
    !state.resultUnavailable &&
    state.command !== undefined &&
    (state.phase === "refused" || (state.phase === "unknown" && state.reconciled === true)) &&
    (state.retryAt ?? 0) <= now
  );
}
