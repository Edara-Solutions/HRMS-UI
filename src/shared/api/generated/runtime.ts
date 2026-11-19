import type { z } from "zod";
import { generatedContractProvenance } from "./metadata";

export type ContractAudience = "company" | "delegated" | "platform" | "public";

export interface ContractViolationContext {
  audience: ContractAudience;
  key: string;
  status?: number;
  phase: "request" | "response" | "status";
}

export class ContractViolation extends Error {
  readonly audience: ContractAudience;
  readonly key: string;
  readonly phase: ContractViolationContext["phase"];
  readonly status?: number;

  readonly provenance = generatedContractProvenance;

  constructor(context: ContractViolationContext) {
    const status = context.status === undefined ? "" : ` (${context.status})`;
    super(`Contract ${context.phase} violation: ${context.audience} ${context.key}${status}`, {});
    this.name = "ContractViolation";
    this.audience = context.audience;
    this.key = context.key;
    this.phase = context.phase;
    this.status = context.status;
  }
}

type ResponseSchemas = Readonly<Record<string, z.ZodType | null>>;

interface OperationDefinition<RequestSchema extends z.ZodType, Responses extends ResponseSchemas> {
  audience: ContractAudience;
  key: string;
  method: string;
  path: string;
  requestSchema: RequestSchema;
  responses: Responses;
}

export function defineOperation<RequestSchema extends z.ZodType, Responses extends ResponseSchemas>(
  definition: OperationDefinition<RequestSchema, Responses>,
) {
  function parseRequest(input: unknown): z.infer<RequestSchema> {
    const result = definition.requestSchema.safeParse(input);
    if (!result.success) {
      throw new ContractViolation({
        audience: definition.audience,
        key: definition.key,
        phase: "request",
      });
    }
    return result.data;
  }

  function parseResponse(status: number, input: unknown, hasBody = true): unknown {
    const exact = definition.responses[String(status)];
    const family = definition.responses[`${Math.floor(status / 100)}XX`];
    const fallback = definition.responses.default;
    const declared = exact !== undefined ? exact : family !== undefined ? family : fallback;
    if (declared === undefined) {
      throw new ContractViolation({
        audience: definition.audience,
        key: definition.key,
        phase: "status",
        status,
      });
    }
    if (declared === null) {
      if (hasBody) {
        throw new ContractViolation({
          audience: definition.audience,
          key: definition.key,
          phase: "response",
          status,
        });
      }
      return undefined;
    }
    const result = declared.safeParse(input);
    if (!result.success) {
      throw new ContractViolation({
        audience: definition.audience,
        key: definition.key,
        phase: "response",
        status,
      });
    }
    return result.data;
  }

  return { ...definition, parseRequest, parseResponse };
}
