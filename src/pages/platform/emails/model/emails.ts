import { z } from "zod";
import { platformCommunicationsOperations as operations } from "@/shared/api";
import type {
  EmailPreview,
  EmailType,
  EmailVariant,
  PreviewLocale,
  RemovalReadiness,
} from "../api/emails";

export type PlatformEmailType = EmailType;
export type PlatformEmailVariant = EmailVariant;
export type PlatformEmailPreview = EmailPreview;
export type PlatformRemovalReadiness = RemovalReadiness;
export type PlatformPreviewLocale = PreviewLocale;

const migrateVariantRequestSchema = operations.migrateVariant.requestSchema;
const testSendRequestSchema = operations.testSend.requestSchema;

export const migrateVariantBodySchema = migrateVariantRequestSchema.shape.body.extend({
  reason: z.string().min(1).max(500).optional(),
});

export const testSendBodySchema = testSendRequestSchema.shape.body.extend({
  recipientEmail: z.string().trim().email(),
});

export type MigrateVariantInput = z.infer<typeof migrateVariantBodySchema>;
export type TestSendInput = z.infer<typeof testSendBodySchema>;

export function platformEmailTypes(types: readonly EmailType[]): EmailType[] {
  return types.filter((type) => type.context === "EDARA");
}

export function variantsForType(
  type: EmailType,
  variants: readonly EmailVariant[],
): EmailVariant[] {
  return variants.filter(
    (variant) =>
      variant.context === type.context &&
      variant.emailTypeKey === type.key &&
      variant.payloadVersion === type.payloadVersion,
  );
}

export function previewLocale(type: EmailType, preferred: PreviewLocale): PreviewLocale {
  return type.supportedLocales.includes(preferred) ? preferred : (type.supportedLocales[0] ?? "en");
}

export function criticalityLabel(
  criticality: "CRITICAL" | "OPERATIONAL",
  t: (key: string) => string,
): string {
  return t(`criticality.${criticality.toLowerCase()}`);
}

export function contextLabel(context: "EDARA" | "COMPANY", t: (key: string) => string): string {
  return t(`context.${context.toLowerCase()}`);
}
