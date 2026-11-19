import { z } from "zod";
import { delegatedCompanyOperations as operations } from "@/shared/api";

type Operations = typeof operations;
export type DelegatedEmailSettings = z.output<Operations["emailSettings"]["responses"]["200"]>;
export type DelegatedEmailSettingsBody = z.input<
  Operations["updateEmailSettings"]["requestSchema"]
>["body"];
export type TemplateAssignment = z.output<
  Operations["templateAssignments"]["responses"]["200"]
>["items"][number];

export const emailSettingsFormSchema =
  operations.updateEmailSettings.requestSchema.shape.body.extend({
    logoUrl: z.union([z.literal(""), z.string().max(2048).url()]),
  });
export type EmailSettingsFormValues = z.infer<typeof emailSettingsFormSchema>;

export const emailSettingsFields = [
  "displayName",
  "senderLocalPart",
  "replyToEmail",
  "footerIdentity",
  "logoUrl",
  "primaryColor",
  "onPrimaryColor",
  "defaultTimeZone",
] as const satisfies readonly (keyof EmailSettingsFormValues)[];

export const emailLocales = emailSettingsFormSchema.shape.defaultLocale.options.map(
  (option) => option.value,
);

export type EmailSettingsField = (typeof emailSettingsFields)[number];

export function isEmailSettingsField(name: string): name is EmailSettingsField {
  return emailSettingsFields.some((field) => field === name);
}

export function toEmailSettingsForm(settings: DelegatedEmailSettings): EmailSettingsFormValues {
  return {
    displayName: settings.displayName,
    logoUrl: settings.logoUrl ?? "",
    primaryColor: settings.primaryColor,
    onPrimaryColor: settings.onPrimaryColor,
    footerIdentity: settings.footerIdentity,
    senderLocalPart: settings.senderLocalPart,
    replyToEmail: settings.replyToEmail,
    defaultLocale: settings.defaultLocale,
    defaultTimeZone: settings.defaultTimeZone,
  };
}

export function toEmailSettingsBody({
  logoUrl,
  ...values
}: EmailSettingsFormValues): DelegatedEmailSettingsBody {
  return logoUrl ? { ...values, logoUrl } : values;
}

export const assignmentFormSchema = operations.assignTemplate.requestSchema.shape.body;
export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
