import { z } from "zod";
import type { platformPeopleOperations } from "@/shared/api";

type Operations = typeof platformPeopleOperations;
export type RosterPage = z.output<Operations["users"]["responses"]["200"]>;
export type PlatformPerson = RosterPage["items"][number];
export type PlatformRole = z.output<Operations["roles"]["responses"]["200"]>["items"][number];
export type Invitation = z.input<Operations["inviteUser"]["requestSchema"]>["body"];

export const rosterPageSize = 20;

/** Roster paging is URL state: validated, bounded, and falling back instead of failing. */
export const rosterSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export type RosterSearch = z.infer<typeof rosterSearchSchema>;

export const inviteFormSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(120, "tooLong"),
  lastName: z.string().trim().min(1, "required").max(120, "tooLong"),
  email: z.string().trim().min(1, "required").max(255, "tooLong").email("email"),
  staffCode: z.string().trim().max(50, "tooLong"),
  jobTitle: z.string().trim().max(120, "tooLong"),
  team: z.string().trim().max(120, "tooLong"),
});

export type InviteFormValues = z.infer<typeof inviteFormSchema>;
export type InviteField = keyof InviteFormValues;

export function isInviteField(name: string): name is InviteField {
  return Object.hasOwn(inviteFormSchema.shape, name);
}

/**
 * The invitation body. Initial roles are sent only when the actor may assign them; otherwise the
 * pending Platform User is created without any implicit role.
 */
export function buildInvitation(
  values: InviteFormValues,
  rolePublicIds: readonly string[],
  canAssign: boolean,
): Invitation {
  const invitation: Invitation = {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
  };
  if (values.staffCode) invitation.staffCode = values.staffCode;
  if (values.jobTitle) invitation.jobTitle = values.jobTitle;
  if (values.team) invitation.team = values.team;
  if (canAssign && rolePublicIds.length > 0) invitation.rolePublicIds = [...rolePublicIds];
  return invitation;
}
