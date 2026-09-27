import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type AccessFacts, projectActionAvailability } from "../auth/access-projections";
import { useCompanySession } from "../auth/company-session";
import { companyAccessPolicyQuery } from "./company-operation";
import type { OperationKey, RefusalMode } from "./generated/authorization";
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
    availability: (operation: OperationKey) => projectActionAvailability(operation, facts),
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
