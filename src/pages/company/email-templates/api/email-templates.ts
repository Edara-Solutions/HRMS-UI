import { queryOptions } from "@tanstack/react-query";
import {
  ContractViolation,
  companyQueryKey,
  companyReadQuery,
  companyCommunicationsOperations as operations,
  requestCompanyOperation,
  sendCompanyCommand,
} from "@/shared/api";
import type { PreviewLocale } from "../model/email-templates";

/** Every template read, keyed under the live identity and the type or locale it concerns. */
export function emailTemplateQueries(userPublicId: string) {
  return {
    types: companyReadQuery(userPublicId, operations.emailTypes),
    detail: (key: string) =>
      queryOptions({
        queryKey: companyQueryKey(userPublicId, operations.emailType, key),
        queryFn: async ({ signal }) => {
          const type = await requestCompanyOperation(
            operations.emailType,
            { params: { key } },
            signal,
          );
          if (type.key !== key || type.context !== "COMPANY")
            throw new ContractViolation({
              audience: "company",
              key: operations.emailType.key,
              status: 200,
              phase: "response",
            });
          return type;
        },
      }),
    assignments: companyReadQuery(userPublicId, operations.templateAssignments),
    variants: (key: string) =>
      queryOptions({
        queryKey: companyQueryKey(userPublicId, operations.emailVariants, key),
        queryFn: ({ signal }) =>
          requestCompanyOperation(operations.emailVariants, { params: { key } }, signal),
      }),
    effective: (emailTypeKey: string) =>
      queryOptions({
        queryKey: companyQueryKey(userPublicId, operations.effectiveTemplate, emailTypeKey),
        queryFn: ({ signal }) =>
          requestCompanyOperation(
            operations.effectiveTemplate,
            { params: { emailTypeKey } },
            signal,
          ),
      }),
    preview: (key: string, locale: PreviewLocale) =>
      queryOptions({
        queryKey: companyQueryKey(userPublicId, operations.emailPreview, key, locale),
        queryFn: ({ signal }) =>
          requestCompanyOperation(
            operations.emailPreview,
            { params: { key }, query: { locale } },
            signal,
          ),
      }),
  };
}

/** What an assignment change can make stale: the list, every effective template and preview. */
export function templateRoots(userPublicId: string) {
  return [
    companyQueryKey(userPublicId, operations.templateAssignments),
    companyQueryKey(userPublicId, operations.effectiveTemplate),
    companyQueryKey(userPublicId, operations.emailPreview),
  ];
}

export function assignTemplate(emailTypeKey: string, templateRevisionKey: string) {
  return requestCompanyOperation(operations.assignTemplate, {
    body: { emailTypeKey, templateRevisionKey },
  });
}

/** Removes the Company's assignment so the type falls back to its default template. */
export function restoreDefaultTemplate(emailTypeKey: string) {
  return sendCompanyCommand(operations.deleteTemplateAssignment, { params: { emailTypeKey } });
}

/** Queues one synthetic test message; the server renders sample data, never a real payload. */
export function sendTestEmail(body: {
  emailTypeKey: string;
  recipientEmail: string;
  locale: PreviewLocale;
}) {
  return requestCompanyOperation(operations.testSend, { body });
}
