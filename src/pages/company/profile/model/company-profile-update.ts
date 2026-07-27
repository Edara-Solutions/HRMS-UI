import type { ProfileFieldName, UpdateCompanyProfileInput } from "../api/company-profile";
import { profileFieldNames } from "../api/company-profile";

export interface CompanyProfileFormValues {
  name: string;
  logoUrl: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  addressLine: string;
  taxNumber: string;
  commercialNumber: string;
}

const nullableFieldNames = [
  "logoUrl",
  "email",
  "phone",
  "country",
  "city",
  "addressLine",
  "taxNumber",
  "commercialNumber",
] as const satisfies readonly ProfileFieldName[];

function isNullableField(name: ProfileFieldName): name is (typeof nullableFieldNames)[number] {
  return nullableFieldNames.some((fieldName) => fieldName === name);
}

export function buildProfileUpdate(
  values: CompanyProfileFormValues,
  dirtyFields: Partial<Record<ProfileFieldName, boolean>>,
) {
  const input: UpdateCompanyProfileInput = {};

  for (const name of profileFieldNames) {
    if (!dirtyFields[name]) continue;
    const value = values[name].trim();
    if (name === "name") {
      input.name = value;
      continue;
    }
    if (isNullableField(name)) {
      input[name] = value === "" ? null : value;
    }
  }

  return input;
}
