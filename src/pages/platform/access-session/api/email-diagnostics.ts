import { queryOptions } from "@tanstack/react-query";
import {
  ContractViolation,
  delegatedQueryKey,
  delegatedCompanyOperations as operations,
  requestDelegatedOperation,
} from "@/shared/api";
import type { DiagnosticCommand } from "../model/email-diagnostics";

export function diagnosticQueries(userPublicId: string, sessionPublicId: string) {
  const params = { sessionPublicId };
  return {
    types: queryOptions({
      queryKey: delegatedQueryKey(userPublicId, sessionPublicId, operations.diagnosticTypes),
      queryFn: ({ signal }) =>
        requestDelegatedOperation(operations.diagnosticTypes, { params }, signal),
      retry: false,
    }),
    preview: (key: string, locale: "en" | "ar") =>
      queryOptions({
        queryKey: delegatedQueryKey(
          userPublicId,
          sessionPublicId,
          operations.diagnosticPreview,
          key,
          locale,
        ),
        queryFn: async ({ signal }) => {
          const preview = await requestDelegatedOperation(
            operations.diagnosticPreview,
            { params: { ...params, key }, query: { locale } },
            signal,
          );
          if (preview.emailTypeKey !== key || preview.locale !== locale)
            throw new ContractViolation({
              audience: "delegated",
              key: operations.diagnosticPreview.key,
              phase: "response",
              status: 200,
            });
          return preview;
        },
        retry: false,
      }),
  };
}

export function sendDiagnostic(sessionPublicId: string, body: DiagnosticCommand) {
  return requestDelegatedOperation(operations.diagnosticSend, {
    params: { sessionPublicId },
    body,
  });
}

export function readDiagnostic(sessionPublicId: string, requestId: string, signal?: AbortSignal) {
  return requestDelegatedOperation(
    operations.diagnosticResult,
    {
      params: { sessionPublicId, requestId },
    },
    signal,
  );
}
