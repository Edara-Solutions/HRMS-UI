import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type AccessFacts, projectActionAvailability } from "../auth/access-projections";
import { useCompanySession } from "../auth/company-session";
import { loadCompanyIdentity } from "./company-api";
import { companyAccessPolicyQuery } from "./company-operation";
import type { OperationKey, RefusalMode } from "./generated/authorization";
import { classifyMutationFailure, type MutationOutcome } from "./mutation-outcome";
import { OperationRefusal } from "./operation-request";

/**
 * The live Company identity and its access facts. The effective mode comes from the access-policy
 * read when permitted, or from a validated `COMPANY_ACCESS_DENIED` refusal recorded against the same
 * cache entry, so every workflow projects C2 restrictions from one authoritative source.
 */
export function useCompanyAccess() {
  const user = useCompanySession((state) => state.session?.user);
  const queryClient = useQueryClient();
  const userPublicId = user?.publicId ?? "";
  const policyQuery = companyAccessPolicyQuery(userPublicId);
  const canReadPolicy =
    user !== undefined &&
    projectActionAvailability("GET /api/v1/company/access-policy", {
      audience: "company",
      authenticated: true,
      permissions: user.permissions,
      owner: user.isOwner,
    }).state !== "hidden";
  const policy = useQuery({ ...policyQuery, enabled: canReadPolicy });
  const facts: AccessFacts = {
    audience: "company",
    authenticated: user !== undefined,
    permissions: user?.permissions ?? [],
    owner: user?.isOwner,
    companyMode: policy.data?.mode,
  };

  return {
    user,
    policy: policy.data,
    facts,
    /** Projects an action; target predicates (self, Owner continuity, ...) come from the caller. */
    availability: (operation: OperationKey, target: Partial<AccessFacts> = {}) =>
      projectActionAvailability(operation, { ...facts, ...target }),
    /** Records a validated refusal mode, then re-reads the policy when this identity may. */
    recordRefusedMode: async (mode: RefusalMode) => {
      queryClient.setQueryData(policyQuery.queryKey, {
        mode,
        reason: null,
        effectiveUntil: null,
      });
      if (canReadPolicy) await queryClient.invalidateQueries({ queryKey: policyQuery.queryKey });
    },
  };
}

/** A validated refusal that means the whole Company workspace is blocked, not one resource. */
export function isCompanyBlocked(error: unknown): error is OperationRefusal {
  return (
    error instanceof OperationRefusal &&
    error.code === "COMPANY_ACCESS_DENIED" &&
    error.mode === "BLOCKED"
  );
}

/**
 * Classifies a failed Company mutation and reconciles authority (M06/M09). A validated access denial
 * is recorded against the policy; any other refusal re-reads the actor's current authority. Callers
 * re-read the affected data in the mutation's own settle step and decide the copy, never a retry.
 */
export function useCompanyMutationRecovery() {
  const access = useCompanyAccess();
  return async (error: unknown): Promise<MutationOutcome> => {
    const outcome = classifyMutationFailure(error);
    if (outcome.kind === "access-restricted") await access.recordRefusedMode(outcome.mode);
    if (outcome.kind === "refused")
      await useCompanySession
        .getState()
        .revalidate(loadCompanyIdentity)
        .catch(() => {});
    return outcome;
  };
}
