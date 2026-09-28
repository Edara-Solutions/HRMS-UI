import type { RefusalMode } from "./generated/authorization";
import { ContractViolation } from "./generated/runtime";
import { OperationRefusal } from "./operation-request";

/**
 * What a failed mutation lets the UI claim. `invalid` (a 400, with any declared field paths) and
 * `refused` are definitive; every other outcome must reconcile authoritative state before another
 * attempt is offered. A workflow whose 400 means a stale transition treats `invalid` as stale.
 */
export type MutationOutcome =
  | { kind: "invalid"; fields: readonly string[] }
  | { kind: "access-restricted"; mode: RefusalMode }
  | { kind: "refused" }
  | { kind: "stale" }
  | { kind: "contract" }
  | { kind: "uncertain" };

export function classifyMutationFailure(error: unknown): MutationOutcome {
  // An undeclared 5xx is an unavailable server, not a malformed contract: the effect is unknown.
  if (error instanceof ContractViolation)
    return error.phase === "status" && (error.status ?? 0) >= 500
      ? { kind: "uncertain" }
      : { kind: "contract" };
  if (!(error instanceof OperationRefusal)) return { kind: "uncertain" };
  if (error.code === "COMPANY_ACCESS_DENIED" && error.mode)
    return { kind: "access-restricted", mode: error.mode };
  if (error.status === 400)
    return {
      kind: "invalid",
      fields: error.invalidParams.map((path) => path.replace(/^\//, "").split("/")[0] ?? ""),
    };
  if (error.status === 403) return { kind: "refused" };
  if ([404, 409, 412, 422].includes(error.status)) return { kind: "stale" };
  return { kind: "uncertain" };
}
