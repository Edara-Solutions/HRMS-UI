import { z } from "zod";
import type { companyPeopleOperations } from "@/shared/api";
import type { AccessFacts, CompanyUser } from "@/shared/auth";

type Operations = typeof companyPeopleOperations;
export type PersonRecord = z.output<Operations["user"]["responses"]["200"]>;
export type PersonUpdate = z.input<Operations["updateUser"]["requestSchema"]>["body"];
export type RoleSummary = z.output<Operations["roles"]["responses"]["200"]>["items"][number];
export type RoleAssignment = z.output<Operations["userRole"]["responses"]["200"]>;
export type PersonSession = z.output<
  Operations["userSessions"]["responses"]["200"]
>["items"][number];

export const personStatuses = [
  "ACTIVE",
  "ONBOARDING",
  "PROBATION",
  "SUSPENDED",
  "TERMINATED",
  "RESIGNED",
] as const satisfies readonly PersonRecord["status"][];
export const employmentTypes = ["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN"] as const;
export const workLocations = ["ONSITE", "REMOTE", "HYBRID"] as const;

/**
 * The only person fields this screen may change. Company, credentials, role, Owner and deletion are
 * separate commands, so no field outside this schema can ever reach the update body.
 */
export const personFormSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(120, "tooLong"),
  lastName: z.string().trim().min(1, "required").max(120, "tooLong"),
  email: z.string().trim().min(1, "required").max(255, "tooLong").email("email"),
  employeeCode: z.string().trim().min(1, "required").max(50, "tooLong"),
  phone: z.string().trim().max(50, "tooLong"),
  level: z.string().trim().max(80, "tooLong"),
  hireDate: z.string().trim(),
  status: z.enum(personStatuses),
  employmentType: z.enum(employmentTypes).nullable(),
  workLocation: z.enum(workLocations).nullable(),
});

export type PersonFormValues = z.infer<typeof personFormSchema>;
export type PersonField = keyof PersonFormValues;

export function isPersonField(name: string): name is PersonField {
  return Object.hasOwn(personFormSchema.shape, name);
}

export function toPersonForm(person: PersonRecord): PersonFormValues {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    employeeCode: person.employeeCode,
    phone: person.phone ?? "",
    level: person.level ?? "",
    hireDate: person.hireDate?.slice(0, 10) ?? "",
    status: person.status,
    employmentType: person.employmentType,
    workLocation: person.workLocation,
  };
}

/** Only edited allow-listed fields are sent; an emptied optional text field becomes null. */
export function buildPersonUpdate(
  values: PersonFormValues,
  dirty: Partial<Record<PersonField, boolean>>,
): PersonUpdate {
  const update: PersonUpdate = {};
  if (dirty.firstName) update.firstName = values.firstName;
  if (dirty.lastName) update.lastName = values.lastName;
  if (dirty.email) update.email = values.email;
  if (dirty.employeeCode) update.employeeCode = values.employeeCode;
  if (dirty.phone) update.phone = values.phone || null;
  if (dirty.level) update.level = values.level || null;
  if (dirty.hireDate) update.hireDate = values.hireDate || null;
  if (dirty.status) update.status = values.status;
  if (dirty.employmentType) update.employmentType = values.employmentType;
  if (dirty.workLocation) update.workLocation = values.workLocation;
  return update;
}

export interface PersonTarget {
  self: boolean;
  owner: boolean;
}

export function personTarget(
  actor: CompanyUser,
  person: PersonRecord,
  assignment: RoleAssignment | null | undefined,
  roles: readonly RoleSummary[],
): PersonTarget {
  return {
    self: actor.publicId === person.publicId,
    owner:
      assignment !== null &&
      assignment !== undefined &&
      roles.some((role) => role.isOwner && role.publicId === assignment.rolePublicId),
  };
}

export type PersonCommand =
  | "invitation"
  | "password-reset"
  | "delete"
  | "revoke-session"
  | "assign-role"
  | "revoke-role"
  | "transfer";

/** Target predicates stay distinct (M06): self, Owner continuity, and the Owner-only transfer. */
export function targetFacts(
  target: PersonTarget,
  command: PersonCommand,
): Pick<AccessFacts, "target" | "requiresOwner"> {
  switch (command) {
    case "invitation":
    case "password-reset":
    case "revoke-session":
      return { target: { self: target.self } };
    case "delete":
    case "assign-role":
    case "revoke-role":
      return { target: { self: target.self, preservesOwner: !target.owner } };
    case "transfer":
      return { requiresOwner: true, target: { self: target.self } };
  }
}
