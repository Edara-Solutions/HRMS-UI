import { type ZodErrorMap, type ZodIssue, ZodIssueCode } from "zod";

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
    if (issue.code === ZodIssueCode.invalid_string && issue.validation === "url")
      return { message: t("auth:journey.fieldUrl") };
    if (issue.code === ZodIssueCode.custom && issue.message) return { message: issue.message };
    return { message: t("auth:journey.invalidField") };
  };
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
