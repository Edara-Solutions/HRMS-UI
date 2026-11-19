import type { z } from "zod";
import type { companyCommunicationsOperations } from "@/shared/api";

type Operations = typeof companyCommunicationsOperations;
export type EmailType = z.output<Operations["emailTypes"]["responses"]["200"]>["items"][number];
export type EmailVariant = z.output<
  Operations["emailVariants"]["responses"]["200"]
>["items"][number];
export type TemplateAssignment = z.output<
  Operations["templateAssignments"]["responses"]["200"]
>["items"][number];
export type PreviewLocale = EmailType["supportedLocales"][number];

/**
 * Only Company-context types are this Company's to configure. Edara-context messages (invitations,
 * credential recovery) are never listed, previewed or test-sent here.
 */
export function companyEmailTypes(types: readonly EmailType[]): EmailType[] {
  return types.filter((type) => type.context === "COMPANY");
}

/** A variant is assignable only when it renders this type, in Company context, at its payload version. */
export function eligibleVariants(
  type: EmailType,
  variants: readonly EmailVariant[],
): EmailVariant[] {
  return variants.filter(
    (variant) =>
      variant.context === "COMPANY" &&
      variant.emailTypeKey === type.key &&
      variant.payloadVersion === type.payloadVersion,
  );
}

/** The Company's own assignment for a type, if it has overridden the default. */
export function assignmentFor(
  type: EmailType,
  assignments: readonly TemplateAssignment[],
): TemplateAssignment | undefined {
  return assignments.find((assignment) => assignment.emailTypeKey === type.key);
}

/** The preferred locale when the type supports it, otherwise the type's first locale. */
export function previewLocale(type: EmailType, preferred: PreviewLocale): PreviewLocale {
  return type.supportedLocales.includes(preferred) ? preferred : (type.supportedLocales[0] ?? "en");
}
