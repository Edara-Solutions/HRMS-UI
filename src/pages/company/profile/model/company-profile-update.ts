import { z } from "zod";
import type { companyOrganizationOperations } from "@/shared/api";

type Operations = typeof companyOrganizationOperations;
export type OrganizationProfile = z.output<Operations["profile"]["responses"]["200"]>;
export type OrganizationProfileUpdate = z.input<
  Operations["updateProfile"]["requestSchema"]
>["body"];

export const profileFieldNames = [
  "name",
  "email",
  "phone",
  "country",
  "city",
  "addressLine",
  "logoUrl",
  "taxNumber",
  "commercialNumber",
] as const;

export type ProfileFieldName = (typeof profileFieldNames)[number];

/** The fields the backend requires before it reports the profile `COMPLETE`. */
export const requiredProfileFieldNames = [
  "name",
  "email",
  "phone",
  "country",
  "city",
  "addressLine",
] as const satisfies readonly ProfileFieldName[];

export const profileFormSchema = z.object({
  name: z.string().trim().min(1, "required").max(255, "tooLong"),
  email: z.string().trim().email("email").or(z.literal("")),
  phone: z.string().trim(),
  country: z.string().trim(),
  city: z.string().trim(),
  addressLine: z.string().trim(),
  logoUrl: z.string().trim().url("url").or(z.literal("")),
  taxNumber: z.string().trim(),
  commercialNumber: z.string().trim(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function toFormValues(profile: OrganizationProfile): ProfileFormValues {
  return {
    name: profile.name,
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    country: profile.country ?? "",
    city: profile.city ?? "",
    addressLine: profile.addressLine ?? "",
    logoUrl: profile.logoUrl ?? "",
    taxNumber: profile.taxNumber ?? "",
    commercialNumber: profile.commercialNumber ?? "",
  };
}

export function isProfileFieldName(name: string): name is ProfileFieldName {
  return profileFieldNames.some((field) => field === name);
}

/** Only edited fields are sent; a cleared optional field is `null`, never an empty string. */
export function buildProfileUpdate(
  values: ProfileFormValues,
  dirtyFields: Partial<Record<ProfileFieldName, boolean>>,
): OrganizationProfileUpdate {
  const update: OrganizationProfileUpdate = {};
  for (const name of profileFieldNames) {
    if (!dirtyFields[name]) continue;
    const value = values[name].trim();
    if (name === "name") update.name = value;
    else update[name] = value === "" ? null : value;
  }
  return update;
}
