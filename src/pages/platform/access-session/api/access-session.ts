import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  accessSessionOperations,
  ContractViolation,
  delegatedQueryKey,
  OperationRefusal,
  delegatedCompanyOperations as operations,
  platformQueryKey,
  requestDelegatedOperation,
  requestPlatformOperation,
} from "@/shared/api";

type Delegated = typeof operations;
export type AuditQuery = NonNullable<z.input<Delegated["auditTrail"]["requestSchema"]>["query"]>;
export type DelegatedAuditPage = z.output<Delegated["auditTrail"]["responses"]["200"]>;
export type DelegatedAuditItem = DelegatedAuditPage["items"][number];

export const auditPageSize = 25;

export function accessSessionQueries(userPublicId: string, sessionPublicId: string) {
  return {
    session: queryOptions({
      queryKey: platformQueryKey(userPublicId, accessSessionOperations.session, sessionPublicId),
      queryFn: ({ signal }) =>
        requestPlatformOperation(
          accessSessionOperations.session,
          { params: { sessionPublicId } },
          signal,
        ),
    }),
  };
}

export function closeAccessSession(sessionPublicId: string) {
  return requestPlatformOperation(accessSessionOperations.close, { params: { sessionPublicId } });
}

export function enterAccessSession(sessionPublicId: string) {
  return requestPlatformOperation(accessSessionOperations.enter, { params: { sessionPublicId } });
}

function retryDelegatedRead(failureCount: number, error: unknown) {
  if (error instanceof ContractViolation) return false;
  if (error instanceof OperationRefusal && [401, 403, 404].includes(error.status)) return false;
  return failureCount < 1;
}

export function delegatedQueries(userPublicId: string, sessionPublicId: string) {
  const params = { sessionPublicId };
  return {
    root: delegatedQueryKey(userPublicId, sessionPublicId),
    auditTrail: (query: AuditQuery) =>
      queryOptions({
        retry: retryDelegatedRead,
        queryKey: delegatedQueryKey(
          userPublicId,
          sessionPublicId,
          operations.auditTrail,
          JSON.stringify(query),
        ),
        queryFn: ({ signal }) =>
          requestDelegatedOperation(operations.auditTrail, { params, query }, signal),
      }),
  };
}
