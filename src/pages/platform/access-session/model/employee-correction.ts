import { z } from "zod";
import type { delegatedCompanyOperations } from "@/shared/api";

type Operations = typeof delegatedCompanyOperations;
export type DelegatedEmployee = z.output<Operations["user"]["responses"]["200"]>;
export type EmployeeCorrection = z.input<Operations["updateUser"]["requestSchema"]>["body"];

export const correctionFields = ["firstName", "lastName", "phone", "photoUrl"] as const;
export type CorrectionField = (typeof correctionFields)[number];

export const correctionFormSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(120, "tooLong"),
  lastName: z.string().trim().min(1, "required").max(120, "tooLong"),
  phone: z.string().trim().max(50, "tooLong"),
  photoUrl: z.string().trim().max(500, "tooLong").url("url").or(z.literal("")),
});
export type CorrectionFormValues = z.infer<typeof correctionFormSchema>;

export function toCorrectionForm(employee: DelegatedEmployee): CorrectionFormValues {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone ?? "",
    photoUrl: employee.photoUrl ?? "",
  };
}

export function isCorrectionField(name: string): name is CorrectionField {
  return correctionFields.some((field) => field === name);
}

export function buildCorrection(
  values: CorrectionFormValues,
  dirtyFields: Partial<Record<CorrectionField, boolean>>,
): EmployeeCorrection {
  const correction: EmployeeCorrection = {};
  if (dirtyFields.firstName) correction.firstName = values.firstName.trim();
  if (dirtyFields.lastName) correction.lastName = values.lastName.trim();
  if (dirtyFields.phone) correction.phone = values.phone.trim() || null;
  if (dirtyFields.photoUrl) correction.photoUrl = values.photoUrl.trim() || null;
  return correction;
}
