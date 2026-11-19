import { z } from "zod";
import {
  operationAuthorization,
  type platformPeopleOperations,
  rootReservedPermissions,
} from "@/shared/api";

type Operations = typeof platformPeopleOperations;
export type PlatformRole = z.output<Operations["roles"]["responses"]["200"]>["items"][number];

export interface GrantGroup {
  resource: string;
  actions: string[];
}

/**
 * Actions a custom role may be granted: every Platform and delegated operation permission in the
 * generated contract, minus the root-reserved authority actions no custom role may ever hold.
 */
export function grantableActions(): string[] {
  const actions = new Set<string>();
  for (const policy of Object.values(operationAuthorization)) {
    if (policy.audience !== "platform" && policy.audience !== "delegated") continue;
    if (policy.permission === null) continue;
    if (rootReservedPermissions.some((reserved) => reserved === policy.permission)) continue;
    actions.add(policy.permission);
  }
  return [...actions].sort();
}

/** Groups actions by the resource before the first colon, keeping the full action for display. */
export function groupGrants(actions: readonly string[]): GrantGroup[] {
  const groups = new Map<string, string[]>();
  for (const action of actions) {
    const resource = action.split(":")[0] ?? action;
    groups.set(resource, [...(groups.get(resource) ?? []), action]);
  }
  return [...groups].map(([resource, grouped]) => ({ resource, actions: grouped }));
}

/**
 * The replacement grant list. Toggles only change grantable actions; a held action the contract
 * no longer lists is kept as-is instead of being silently dropped, and the backend stays the judge.
 */
export function replacementActions(
  held: readonly string[],
  selected: ReadonlySet<string>,
  grantable: readonly string[],
): string[] {
  const known = new Set(grantable);
  const kept = held.filter((action) => !known.has(action));
  return [...kept, ...grantable.filter((action) => selected.has(action))];
}

export interface GrantChange {
  added: number;
  removed: number;
}

export function grantChange(held: readonly string[], replacement: readonly string[]): GrantChange {
  const before = new Set(held);
  const after = new Set(replacement);
  return {
    added: [...after].filter((action) => !before.has(action)).length,
    removed: [...before].filter((action) => !after.has(action)).length,
  };
}

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "required").max(100, "tooLong"),
  description: z.string().trim().max(500, "tooLong"),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

/** The actor holds this role; its grants cannot be edited or the role deleted by them. */
export function isSelfHeld(role: PlatformRole, actorRoleNames: readonly string[]) {
  return actorRoleNames.includes(role.name);
}
