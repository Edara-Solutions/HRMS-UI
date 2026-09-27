import { z } from "zod";
import type { platformPeopleOperations } from "@/shared/api";
import type { AccessFacts, PlatformUser } from "@/shared/auth";

type Operations = typeof platformPeopleOperations;
export type PersonRecord = z.output<Operations["user"]["responses"]["200"]>;
export type PersonUpdate = z.input<Operations["updateUser"]["requestSchema"]>["body"];
export type PlatformRole = z.output<Operations["roles"]["responses"]["200"]>["items"][number];
export type RoleAssignment = z.output<
  Operations["assignments"]["responses"]["200"]
>["items"][number];
export type PersonSession = z.output<
  Operations["userSessions"]["responses"]["200"]
>["items"][number];

/**
 * The only staff-profile fields this screen may change. Email, credentials, lifecycle, sessions and
 * authority are separate commands, so no field outside this schema can ever reach the update body.
 */
export const profileFormSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(120, "tooLong"),
  lastName: z.string().trim().min(1, "required").max(120, "tooLong"),
  staffCode: z.string().trim().max(50, "tooLong"),
  jobTitle: z.string().trim().max(120, "tooLong"),
  team: z.string().trim().max(120, "tooLong"),
  startedAt: z.string().trim(),
  locale: z.string().trim().min(2, "required").max(12, "tooLong"),
  timezone: z.string().trim().min(1, "required").max(64, "tooLong"),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type ProfileField = keyof ProfileFormValues;

export function isProfileField(name: string): name is ProfileField {
  return Object.hasOwn(profileFormSchema.shape, name);
}

export function toProfileForm(person: PersonRecord): ProfileFormValues {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    staffCode: person.staffCode ?? "",
    jobTitle: person.jobTitle ?? "",
    team: person.team ?? "",
    startedAt: person.startedAt?.slice(0, 10) ?? "",
    locale: person.locale,
    timezone: person.timezone,
  };
}

/** Only edited allow-listed fields are sent; an emptied optional text field becomes null. */
export function buildProfileUpdate(
  values: ProfileFormValues,
  dirty: Partial<Record<ProfileField, boolean>>,
): PersonUpdate {
  const update: PersonUpdate = {};
  if (dirty.firstName) update.firstName = values.firstName;
  if (dirty.lastName) update.lastName = values.lastName;
  if (dirty.staffCode) update.staffCode = values.staffCode || null;
  if (dirty.jobTitle) update.jobTitle = values.jobTitle || null;
  if (dirty.team) update.team = values.team || null;
  if (dirty.startedAt) update.startedAt = values.startedAt || null;
  if (dirty.locale) update.locale = values.locale;
  if (dirty.timezone) update.timezone = values.timezone;
  return update;
}

export interface PersonTarget {
  self: boolean;
  /** The target holds the protected root role; `undefined` while its assignments are unknown. */
  root: boolean | undefined;
}

/**
 * Self and root facts for a roster target. Root standing is known only once both the target's
 * assignments and the role catalogue have been read.
 */
export function personTarget(
  actor: PlatformUser,
  person: PersonRecord,
  assignments: readonly RoleAssignment[] | undefined,
  roles: readonly PlatformRole[] | undefined,
): PersonTarget {
  const self = actor.publicId === person.publicId;
  if (!assignments || !roles) return { self, root: undefined };
  const rootRoles = new Set(roles.filter((role) => role.isSystem).map((role) => role.publicId));
  return {
    self,
    root: assignments.some((assignment) => rootRoles.has(assignment.rolePublicId)),
  };
}

export type PersonCommand =
  | "invitation"
  | "password-reset"
  | "suspend"
  | "unsuspend"
  | "delete"
  | "revoke-sessions"
  | "assign-role"
  | "revoke-assignment";

type RosterCommand = Exclude<PersonCommand, "assign-role" | "revoke-assignment">;

/** The lifecycle state each roster command requires; a command absent here accepts any state. */
const requiredStatus: Partial<Record<RosterCommand, (status: PersonRecord["status"]) => boolean>> =
  {
    invitation: (status) => status === "PENDING",
    "password-reset": (status) => status !== "PENDING",
    suspend: (status) => status === "ACTIVE",
    unsuspend: (status) => status === "SUSPENDED",
  };

function isRosterCommand(command: PersonCommand): command is RosterCommand {
  return command !== "assign-role" && command !== "revoke-assignment";
}

/**
 * Target predicates stay distinct (M06): self-target, a root target protected from a non-root
 * actor, and the lifecycle state each command requires. A non-root actor who cannot yet tell
 * whether the target is root fails closed. Final-root continuity is never decided here; the
 * backend refuses it and the page reconciles.
 */
export function targetFacts(
  target: PersonTarget,
  actorRoot: boolean,
  status: PersonRecord["status"],
  command: PersonCommand,
): Pick<AccessFacts, "target" | "restriction"> {
  // Assignment commands refuse only self-assignment and self-revocation.
  if (!isRosterCommand(command)) return { target: { self: target.self } };
  const lifecycle = requiredStatus[command];
  return {
    target: {
      self: target.self,
      protectedRoot: target.root === true && !actorRoot,
      lifecycleAllowed: lifecycle ? lifecycle(status) : undefined,
    },
    restriction: target.root === undefined && !actorRoot ? "access-unverified" : undefined,
  };
}

/** Roles the target does not already hold, in catalogue order. */
export function assignableRoles(
  roles: readonly PlatformRole[],
  assignments: readonly RoleAssignment[],
): PlatformRole[] {
  const held = new Set(assignments.map((assignment) => assignment.rolePublicId));
  return roles.filter((role) => !held.has(role.publicId));
}

export type AssignmentExpiry = { kind: "valid"; expiresAt: string | null } | { kind: "past" };

/**
 * The expiry sent with an assignment. The root role never expires, so it always sends null; an
 * expiry must be a future instant and is refused before any request otherwise.
 */
export function assignmentExpiry(
  role: PlatformRole,
  localValue: string,
  now: Date,
): AssignmentExpiry {
  if (role.isSystem || localValue === "") return { kind: "valid", expiresAt: null };
  const instant = new Date(localValue);
  if (Number.isNaN(instant.getTime()) || instant.getTime() <= now.getTime())
    return { kind: "past" };
  return { kind: "valid", expiresAt: instant.toISOString() };
}
