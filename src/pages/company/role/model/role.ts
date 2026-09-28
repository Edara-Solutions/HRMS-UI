import { z } from "zod";
import type { companyPeopleOperations } from "@/shared/api";

type Operations = typeof companyPeopleOperations;
export type RoleDetail = z.output<Operations["role"]["responses"]["200"]>;
export type PermissionGroup = z.output<
  Operations["permissionCatalogue"]["responses"]["200"]
>[number];

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "required").max(100, "tooLong"),
  description: z.string().trim().max(500, "tooLong"),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export interface PermissionChange {
  added: number;
  removed: number;
}

/**
 * Only catalogue permissions can be granted. A grant the role holds that the catalogue no longer
 * lists is dropped from the replacement rather than re-sent blindly.
 */
export function grantablePermissionIds(
  catalogue: readonly PermissionGroup[],
  selected: ReadonlySet<string>,
): string[] {
  const known = new Set(
    catalogue.flatMap((group) => group.permissions.map((permission) => permission.publicId)),
  );
  return [...selected].filter((id) => known.has(id));
}

/** Counts what saving would add and remove, against the replacement that would actually be sent. */
export function permissionChange(
  role: RoleDetail,
  catalogue: readonly PermissionGroup[],
  selected: ReadonlySet<string>,
): PermissionChange {
  const current = new Set(role.permissions.map((permission) => permission.publicId));
  const replacement = new Set(grantablePermissionIds(catalogue, selected));
  return {
    added: [...replacement].filter((id) => !current.has(id)).length,
    removed: [...current].filter((id) => !replacement.has(id)).length,
  };
}
