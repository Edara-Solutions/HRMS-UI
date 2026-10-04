import { z } from "zod";
import type { AudienceClient } from "./audience-client";
import {
  generatedRefusalCodes,
  generatedRefusalModes,
  type RefusalCode,
  type RefusalMode,
} from "./generated/authorization";
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
  readonly code?: RefusalCode;
  readonly mode?: RefusalMode;
  /** Bounded timing from a validated diagnostic rate-limit envelope. */
  readonly retryAfterSeconds?: number;
  /** Field names the validated problem declared invalid; never the backend's message text. */
  readonly invalidParams: readonly string[];

  constructor(operation: ResponseContract, status: number, validatedProblem: unknown) {
    super("The request could not be completed.");
    this.name = "OperationRefusal";
    this.status = status;
    this.audience = operation.audience;
    this.key = operation.key;
    const metadata = z
      .object({
        code: z.enum(generatedRefusalCodes).optional(),
        mode: z.enum(generatedRefusalModes).optional(),
        invalidParams: z.array(z.string()).optional(),
        retryAfterSeconds: z.number().int().min(1).max(600).optional(),
      })
      .safeParse(validatedProblem);
    this.invalidParams = metadata.success ? (metadata.data.invalidParams ?? []) : [];
    if (metadata.success) {
      this.code = metadata.data.code;
      this.mode = metadata.data.mode;
      this.retryAfterSeconds = metadata.data.retryAfterSeconds;
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
      // A declared array parameter repeats its key once per value, in order.
      for (const item of Array.isArray(value) ? value : [value]) {
        if (!["string", "number", "boolean"].includes(typeof item)) throw invalidRequest();
        searchParams.append(key, String(item));
      }
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
