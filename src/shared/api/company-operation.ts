import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  type AudienceCommand,
  type AudienceOperation,
  requestAudienceOperation,
  sendAudienceCommand,
} from "./audience-operation";
import { operation as accessPolicy } from "./generated/company/get-api-v1-company-access-policy";
import { operation as emailReadiness } from "./generated/company/get-api-v1-company-email-readiness";

/** A Company operation whose declared success (200, 201 or 202) carries a body. */
export function requestCompanyOperation<Success extends z.ZodTypeAny>(
  operation: AudienceOperation<Success>,
  input: unknown,
  signal?: AbortSignal,
): Promise<z.output<Success>> {
  return requestAudienceOperation("company", operation, input, signal);
}

/** A Company command whose declared success is a bodyless 204. */
export function sendCompanyCommand(operation: AudienceCommand, input: unknown): Promise<void> {
  return sendAudienceCommand("company", operation, input);
}

/** Cache root for Company data: audience + Company User, then the operation and its public inputs. */
export function companyQueryKey(
  userPublicId: string,
  operation: { key: string },
  ...inputs: readonly (string | number)[]
) {
  return ["company", userPublicId, operation.key, ...inputs] as const;
}

/** A parameterless Company read keyed under the live identity's cache root. */
export function companyReadQuery<Success extends z.ZodTypeAny>(
  userPublicId: string,
  operation: AudienceOperation<Success>,
) {
  return queryOptions({
    queryKey: companyQueryKey(userPublicId, operation),
    queryFn: ({ signal }) => requestCompanyOperation(operation, {}, signal),
  });
}

/** The effective access mode. Read by every Company workflow that projects C2 write restrictions. */
export function companyAccessPolicyQuery(userPublicId: string) {
  return companyReadQuery(userPublicId, accessPolicy);
}

/**
 * Email readiness is owned by the Company communications workflow. Other pages consume this
 * read-only seam so they share one cache entry and the generated schema, never a sibling page.
 */
export function companyEmailReadinessQuery(userPublicId: string) {
  return companyReadQuery(userPublicId, emailReadiness);
}
