import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import { useCompanySession } from "../auth/company-session";
import { companyApiClient } from "./company-client";
import { operation as accessPolicy } from "./generated/company/get-api-v1-company-access-policy";
import { operation as emailReadiness } from "./generated/company/get-api-v1-company-email-readiness";
import { executeOperationRequest, type RequestContract } from "./operation-request";

interface CompanyOperation<Success extends z.ZodTypeAny> extends RequestContract {
  responses: { "200": Success } | { "201": Success };
}

interface CompanyCommand extends RequestContract {
  responses: { "204": null };
}

export class CompanySessionChanged extends Error {
  constructor() {
    super("The Company session changed before the request settled.");
    this.name = "CompanySessionChanged";
  }
}

/**
 * Sends one generated Company operation for the live session. Company scope is never an input:
 * the backend derives it from the token, so callers cannot select or disclose another Company.
 * A response that settles after the identity was replaced is rejected instead of rendered.
 */
async function sendForLiveSession(
  operation: RequestContract,
  input: unknown,
  signal?: AbortSignal,
) {
  const { generation, session, status, isCurrentGeneration } = useCompanySession.getState();
  if (!session || status !== "authenticated" || !isCurrentGeneration(generation))
    throw new CompanySessionChanged();
  const body = await executeOperationRequest(companyApiClient, operation, input, { signal });
  if (!useCompanySession.getState().isCurrentGeneration(generation))
    throw new CompanySessionChanged();
  return body;
}

/** A Company operation whose declared success (200 or 201) carries a body. */
export async function requestCompanyOperation<Success extends z.ZodTypeAny>(
  operation: CompanyOperation<Success>,
  input: unknown,
  signal?: AbortSignal,
): Promise<z.output<Success>> {
  const body = await sendForLiveSession(operation, input, signal);
  const success =
    "200" in operation.responses ? operation.responses["200"] : operation.responses["201"];
  return success.parse(body);
}

/** A Company command whose declared success is a bodyless 204. */
export async function sendCompanyCommand(operation: CompanyCommand, input: unknown): Promise<void> {
  await sendForLiveSession(operation, input);
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
  operation: CompanyOperation<Success>,
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
