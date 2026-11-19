import { type ZodErrorMap, type ZodIssue, ZodIssueCode, ZodObject, ZodString } from "zod";

type Translate = (key: string, values?: { count?: number }) => string;

export function fieldErrorMap(t: Translate): ZodErrorMap {
  return (issue) => {
    if (issue.code === ZodIssueCode.too_small && issue.type === "string")
      return {
        message:
          Number(issue.minimum) <= 1
            ? t("auth:journey.fieldRequired")
            : t("auth:journey.fieldTooShort", { count: Number(issue.minimum) }),
      };
    if (issue.code === ZodIssueCode.too_big && issue.type === "string")
      return { message: t("auth:journey.fieldTooLong", { count: Number(issue.maximum) }) };
    if (issue.code === ZodIssueCode.invalid_string && issue.validation === "email")
      return { message: t("auth:journey.fieldEmail") };
    if (
      issue.code === ZodIssueCode.invalid_string &&
      issue.validation === "regex" &&
      issue.path.at(-1) === "newPassword"
    )
      return { message: t("auth:journey.fieldPasswordCharacters") };
    if (issue.code === ZodIssueCode.invalid_string && issue.validation === "url")
      return { message: t("auth:journey.fieldUrl") };
    if (issue.code === ZodIssueCode.custom && issue.message) return { message: issue.message };
    return { message: t("auth:journey.invalidField") };
  };
}

export function passwordRuleHint(t: Translate, schema: unknown, name: string): string | null {
  if (name !== "newPassword") return null;
  const field = schema instanceof ZodObject ? schema.shape[name] : undefined;
  if (!(field instanceof ZodString) || field.minLength === null) return null;
  return t("auth:journey.passwordRule", { count: field.minLength });
}

export function fieldErrors(
  issues: readonly ZodIssue[],
  fields: ReadonlySet<string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (fields.has(field) && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
