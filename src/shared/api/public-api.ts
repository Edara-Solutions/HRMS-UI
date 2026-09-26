import ky from "ky";
import type { z } from "zod";
import { apiBaseUrl } from "./config";
import type { defineOperation } from "./generated/runtime";
import { ContractViolation } from "./generated/runtime";

type GeneratedOperation = ReturnType<typeof defineOperation>;

const publicBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "");

const publicApi = ky.create({
  prefixUrl: publicBaseUrl,
  credentials: "omit",
  retry: 0,
  redirect: "error",
});

interface PublicRequestOptions<ResponseSchema extends z.ZodType> {
  operation: GeneratedOperation;
  request: unknown;
  responseSchema: ResponseSchema;
}

export async function executePublicRequest<ResponseSchema extends z.ZodType>({
  operation,
  request,
  responseSchema,
}: PublicRequestOptions<ResponseSchema>): Promise<z.infer<ResponseSchema>> {
  if (operation.audience !== "public") {
    throw new ContractViolation({
      audience: operation.audience,
      key: operation.key,
      phase: "request",
    });
  }
  const parsedRequest = operation.parseRequest(request);
  const response = await publicApi(operation.path.replace(/^\//, ""), {
    method: operation.method,
    searchParams: requestSearchParams(parsedRequest, operation),
    throwHttpErrors: false,
  });
  const text = await response.text();
  const hasBody = text.length > 0;
  let body: unknown;
  if (hasBody) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ContractViolation({
        audience: operation.audience,
        key: operation.key,
        phase: "response",
        status: response.status,
      });
    }
  }
  const parsed = operation.parseResponse(response.status, body, hasBody);
  if (!response.ok) throw new Error(`Public API request failed (${response.status})`);
  const result = responseSchema.safeParse(parsed);
  if (!result.success) {
    throw new ContractViolation({
      audience: operation.audience,
      key: operation.key,
      phase: "response",
      status: response.status,
    });
  }
  return result.data;
}

function requestSearchParams(request: unknown, operation: GeneratedOperation) {
  const searchParams = new URLSearchParams();
  if (typeof request !== "object" || request === null || !("query" in request)) return searchParams;
  const query = request.query;
  if (typeof query !== "object" || query === null) return searchParams;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new ContractViolation({
        audience: operation.audience,
        key: operation.key,
        phase: "request",
      });
    }
    searchParams.set(key, String(value));
  }
  return searchParams;
}
