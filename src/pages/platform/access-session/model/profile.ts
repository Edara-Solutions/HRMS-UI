import { z } from "zod";
import type { delegatedCompanyOperations } from "@/shared/api";

type Operations = typeof delegatedCompanyOperations;
export type DelegatedProfile = z.output<Operations["profile"]["responses"]["200"]>;
export type DelegatedProfileUpdate = z.input<Operations["updateProfile"]["requestSchema"]>["body"];

export const profileFields = [
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
export type ProfileField = (typeof profileFields)[number];

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

export function toProfileForm(profile: DelegatedProfile): ProfileFormValues {
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

export function isProfileField(name: string): name is ProfileField {
  return profileFields.some((field) => field === name);
}

export function buildProfileUpdate(
  values: ProfileFormValues,
  dirtyFields: Partial<Record<ProfileField, boolean>>,
): DelegatedProfileUpdate {
  const update: DelegatedProfileUpdate = {};
  for (const name of profileFields) {
    if (!dirtyFields[name]) continue;
    const value = values[name].trim();
    if (name === "name") update.name = value;
    else update[name] = value === "" ? null : value;
  }
  return update;
}
