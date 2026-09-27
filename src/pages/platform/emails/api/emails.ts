import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  ContractViolation,
  platformCommunicationsOperations as operations,
  platformQueryKey,
  platformReadQuery,
  requestPlatformOperation,
} from "@/shared/api";

export type EmailType = z.output<(typeof operations.emailTypes.responses)["200"]>["items"][number];
export type EmailVariant = z.output<
  (typeof operations.emailVariants.responses)["200"]
>["items"][number];
export type EmailPreview = z.output<(typeof operations.emailPreview.responses)["200"]>;
export type RemovalReadiness = z.output<
  (typeof operations.variantRemovalReadiness.responses)["200"]
>;
export type MigrateResult = z.output<(typeof operations.migrateVariant.responses)["200"]>;
export type TestSendResult = z.output<(typeof operations.testSend.responses)["202"]>;
export type PreviewLocale = EmailType["supportedLocales"][number];

export function emailQueries(userPublicId: string) {
  return {
    types: platformReadQuery(userPublicId, operations.emailTypes),
    detail: (key: string) =>
      queryOptions({
        queryKey: platformQueryKey(userPublicId, operations.emailType, key),
        queryFn: async ({ signal }) => {
          const result = await requestPlatformOperation(
            operations.emailType,
            { params: { key } },
            signal,
          );
          if (result.key !== key || result.context !== "EDARA")
            throw new ContractViolation({
              audience: "platform",
              key: operations.emailType.key,
              status: 200,
              phase: "response",
            });
          return result;
        },
      }),
    preview: (key: string, locale: PreviewLocale) =>
      queryOptions({
        queryKey: platformQueryKey(userPublicId, operations.emailPreview, key, locale),
        queryFn: async ({ signal }) => {
          const result = await requestPlatformOperation(
            operations.emailPreview,
            { params: { key }, query: { locale } },
            signal,
          );
          if (result.context !== "EDARA" || result.emailTypeKey !== key || result.locale !== locale)
            throw new ContractViolation({
              audience: "platform",
              key: operations.emailPreview.key,
              status: 200,
              phase: "response",
            });
          return result;
        },
      }),
    variants: (key: string) =>
      queryOptions({
        queryKey: platformQueryKey(userPublicId, operations.emailVariants, key),
        queryFn: ({ signal }) =>
          requestPlatformOperation(operations.emailVariants, { params: { key } }, signal),
      }),
    readiness: (variantKey: string) =>
      queryOptions({
        queryKey: platformQueryKey(userPublicId, operations.variantRemovalReadiness, variantKey),
        queryFn: ({ signal }) =>
          requestPlatformOperation(
            operations.variantRemovalReadiness,
            { params: { key: variantKey } },
            signal,
          ),
      }),
  };
}

export function migrateVariant(
  variantKey: string,
  body: z.input<typeof operations.migrateVariant.requestSchema>["body"],
) {
  return requestPlatformOperation(operations.migrateVariant, { params: { key: variantKey }, body });
}

export function sendTestEmail(body: z.input<typeof operations.testSend.requestSchema>["body"]) {
  return requestPlatformOperation(operations.testSend, { body });
}

export function emailRoots(userPublicId: string) {
  return [
    platformQueryKey(userPublicId, operations.emailTypes),
    platformQueryKey(userPublicId, operations.emailPreview),
    platformQueryKey(userPublicId, operations.emailVariants),
    platformQueryKey(userPublicId, operations.variantRemovalReadiness),
    platformQueryKey(userPublicId, operations.migrateVariant),
    platformQueryKey(userPublicId, operations.testSend),
  ];
}
