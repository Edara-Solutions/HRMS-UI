import { type AccessFacts, projectActionAvailability } from "../auth/access-projections";
import { usePlatformSession } from "../auth/platform-session";
import {
  type OperationKey,
  type OperationPermission,
  operationAuthorization,
} from "./generated/authorization";
import { classifyMutationFailure, type MutationOutcome } from "./mutation-outcome";
import { loadPlatformIdentity } from "./platform-api";

/** The protected root role. Its name is a prerequisite fact from `/me`, never a permission by itself. */
export const platformRootRoleName = "SUPER_ADMIN";

export const delegationOpenPermission = "delegation:open";

/** Authority administration actions that only the current root holder may use, and no custom role may hold. */
export const rootReservedPermissions: readonly OperationPermission[] = [
  "platform-roles:create",
  "platform-roles:update",
  "platform-roles:delete",
  "platform-roles:assign",
];

function isRootReserved(operation: OperationKey) {
  const { permission } = operationAuthorization[operation];
  return rootReservedPermissions.some((reserved) => reserved === permission);
}

function isOperationKey(key: string): key is OperationKey {
  return Object.hasOwn(operationAuthorization, key);
}

/**
 * The live Platform identity and its access facts. A reserved operation needs both its permission
 * and current root standing; the root role name alone never synthesizes a permission (M06).
 */
export function usePlatformAccess() {
  const user = usePlatformSession((state) => state.session?.user);
  const facts: AccessFacts = {
    audience: "platform",
    authenticated: user !== undefined,
    mustChangePassword: user?.mustChangePassword,
    permissions: user?.permissions ?? [],
    root: user?.roleNames.includes(platformRootRoleName) ?? false,
  };

  return {
    user,
    facts,
    /** Projects an action; target predicates (self, protected root, ...) come from the caller. */
    availability: (operation: string, target: Partial<AccessFacts> = {}) =>
      isOperationKey(operation)
        ? projectActionAvailability(operation, {
            ...facts,
            requiresRoot: isRootReserved(operation),
            ...target,
          })
        : { state: "hidden" as const },
    delegatedAvailability: (operation: string, accessSession: "live" | "inactive") =>
      isOperationKey(operation)
        ? projectActionAvailability(operation, {
            ...facts,
            accessSession,
            delegatedScopeMatches: true,
            delegatedGrant: facts.permissions?.includes(delegationOpenPermission) ?? false,
          })
        : { state: "hidden" as const },
  };
}

/**
 * Classifies a failed Platform mutation. A refusal or conflict can mean the actor lost authority,
 * so it re-reads `/me` before any control is recomputed; callers re-read the affected data in the
 * mutation's settle step and decide the copy, never a retry.
 */
export function usePlatformMutationRecovery() {
  return async (error: unknown): Promise<MutationOutcome> => {
    const outcome = classifyMutationFailure(error);
    if (outcome.kind === "refused" || outcome.kind === "stale")
      await usePlatformSession
        .getState()
        .revalidate(loadPlatformIdentity)
        // A failed re-read is handled by the session store itself (refresh, quarantine or sign-out).
        .catch(() => {});
    return outcome;
  };
}
