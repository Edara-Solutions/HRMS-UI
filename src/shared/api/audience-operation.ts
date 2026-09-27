import type { z } from "zod";
import type { AudienceName } from "../auth/audience-session";
import { useCompanySession } from "../auth/company-session";
import { usePlatformSession } from "../auth/platform-session";
import type { AudienceClient } from "./audience-client";
import { companyApiClient } from "./company-client";
import { executeOperationRequest, type RequestContract } from "./operation-request";
import { platformApiClient } from "./platform-client";

export interface AudienceOperation<Success extends z.ZodTypeAny> extends RequestContract {
  responses: { "200": Success } | { "201": Success } | { "202": Success };
}

export interface AudienceCommand extends RequestContract {
  responses: { "204": null };
}

export class AudienceSessionChanged extends Error {
  constructor() {
    super("The audience session changed before the request settled.");
    this.name = "AudienceSessionChanged";
  }
}

interface LiveSessionState {
  generation: string;
  session: unknown;
  status: string;
  isCurrentGeneration: (generation: string) => boolean;
}

const transports: Record<AudienceName, { client: AudienceClient; state: () => LiveSessionState }> =
  {
    company: { client: companyApiClient, state: () => useCompanySession.getState() },
    platform: { client: platformApiClient, state: () => usePlatformSession.getState() },
  };

/**
 * Sends one generated operation for the audience's live session. Scope is never an input: the
 * backend derives it from the token. A response that settles after the identity was replaced is
 * rejected instead of rendered, so it can never populate the replacement's UI.
 */
async function sendForLiveSession(
  audience: AudienceName,
  operation: RequestContract,
  input: unknown,
  signal?: AbortSignal,
) {
  const transport = transports[audience];
  const { generation, session, status, isCurrentGeneration } = transport.state();
  if (!session || status !== "authenticated" || !isCurrentGeneration(generation))
    throw new AudienceSessionChanged();
  const body = await executeOperationRequest(transport.client, operation, input, { signal });
  if (!transport.state().isCurrentGeneration(generation)) throw new AudienceSessionChanged();
  return body;
}

/** An operation whose declared success (200, 201 or 202) carries a body. */
export async function requestAudienceOperation<Success extends z.ZodTypeAny>(
  audience: AudienceName,
  operation: AudienceOperation<Success>,
  input: unknown,
  signal?: AbortSignal,
): Promise<z.output<Success>> {
  const body = await sendForLiveSession(audience, operation, input, signal);
  const { responses } = operation;
  const success =
    "200" in responses
      ? responses["200"]
      : "201" in responses
        ? responses["201"]
        : responses["202"];
  return success.parse(body);
}

/** A command whose declared success is a bodyless 204. */
export async function sendAudienceCommand(
  audience: AudienceName,
  operation: AudienceCommand,
  input: unknown,
): Promise<void> {
  await sendForLiveSession(audience, operation, input);
}
