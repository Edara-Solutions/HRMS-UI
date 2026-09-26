import type { AudienceClient } from "./audience-client";
import { ContractViolation } from "./generated/runtime";
import { type ResponseContract, readOperationResponse } from "./operation-response";

export interface RequestContract extends ResponseContract {
  method: string;
  path: string;
  parseRequest: (request: unknown) => unknown;
}

interface OperationRequestOptions {
  accessToken?: string;
  signal?: AbortSignal;
  skipRefresh?: boolean;
}

export class OperationRefusal extends Error {
  readonly status: number;
  readonly audience: ResponseContract["audience"];
  readonly key: string;
  readonly code?: string;

  constructor(operation: ResponseContract, status: number, validatedProblem: unknown) {
    super("The request could not be completed.");
    this.name = "OperationRefusal";
    this.status = status;
    this.audience = operation.audience;
    this.key = operation.key;
    if (
      typeof validatedProblem === "object" &&
      validatedProblem !== null &&
      "code" in validatedProblem &&
      typeof validatedProblem.code === "string"
    ) {
      this.code = validatedProblem.code;
    }
  }
}

export async function executeOperationRequest(
  client: AudienceClient,
  operation: RequestContract,
  input: unknown,
  options: OperationRequestOptions = {},
): Promise<unknown> {
  const invalidRequest = () =>
    new ContractViolation({ audience: operation.audience, key: operation.key, phase: "request" });
  if (client.audience !== operation.audience) throw invalidRequest();
  const parsed = operation.parseRequest(input);
  if (typeof parsed !== "object" || parsed === null) throw invalidRequest();
  let path = operation.path;
  if ("params" in parsed && typeof parsed.params === "object" && parsed.params !== null) {
    for (const [key, value] of Object.entries(parsed.params)) {
      if (typeof value !== "string" && typeof value !== "number") throw invalidRequest();
      path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
    }
  }
  if (path.includes("{") || path.includes("}")) throw invalidRequest();
  const searchParams = new URLSearchParams();
  if ("query" in parsed && typeof parsed.query === "object" && parsed.query !== null) {
    for (const [key, value] of Object.entries(parsed.query)) {
      if (value === undefined || value === null) continue;
      if (!["string", "number", "boolean"].includes(typeof value)) throw invalidRequest();
      searchParams.set(key, String(value));
    }
  }
  const response = await client(path.replace(/^\//, ""), {
    method: operation.method,
    json: "body" in parsed ? parsed.body : undefined,
    searchParams,
    signal: options.signal,
    headers: options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : undefined,
    context: { operation, skipRefresh: options.skipRefresh },
    throwHttpErrors: false,
  });
  const result = await readOperationResponse(operation, response);
  if (!response.ok) throw new OperationRefusal(operation, response.status, result);
  return result;
}
