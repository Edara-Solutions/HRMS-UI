import { z } from "zod";
import { companyCommunicationsOperations as operations } from "@/shared/api";

type Operations = typeof operations;
export type EmailSettings = z.output<Operations["emailSettings"]["responses"]["200"]>;
export type EmailSettingsBody = z.input<Operations["updateEmailSettings"]["requestSchema"]>["body"];
export type SendingDomain = z.output<Operations["sendingDomain"]["responses"]["200"]>;
export type DomainReadiness = z.output<Operations["sendingDomainReadiness"]["responses"]["200"]>;

const bodySchema = operations.updateEmailSettings.requestSchema.shape.body;

/** The generated body, except that an empty logo field means "no logo" rather than a bad URL. */
export const emailSettingsFormSchema = bodySchema.extend({
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

export function toEmailSettingsForm(settings: EmailSettings): EmailSettingsFormValues {
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

/** The settings replace as a whole; an empty logo is omitted rather than sent as an empty URL. */
export function toEmailSettingsBody({
  logoUrl,
  ...values
}: EmailSettingsFormValues): EmailSettingsBody {
  return logoUrl ? { ...values, logoUrl } : values;
}

export type DomainState =
  | "not-configured"
  | "dns-pending"
  | "verification-failed"
  | "stale"
  | "unhealthy"
  | "verified"
  | "ready";

/**
 * One readable state from the domain record and its readiness. Stale DNS and an unhealthy domain
 * are distinct from a failed verification: the first two were verified once and drifted.
 */
export function domainState(
  domain: SendingDomain | null,
  readiness: DomainReadiness | undefined,
): DomainState {
  if (domain === null) return "not-configured";
  if (domain.status === "FAILED") return "verification-failed";
  if (domain.status !== "VERIFIED") return "dns-pending";
  if (domain.health === "UNHEALTHY") return "unhealthy";
  // Verified, but readiness is loading or not readable by this identity: say only what is known.
  if (readiness === undefined) return "verified";
  if (readiness.reason === "STALE") return "stale";
  if (readiness.reason === "UNHEALTHY") return "unhealthy";
  return readiness.ready ? "ready" : "verified";
}
