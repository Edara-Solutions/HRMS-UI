import type { AudienceClient } from "@/shared/api/audience-client";
import type { RequestContract } from "@/shared/api/operation-request";

export interface OperationReply {
  status: number;
  body?: unknown;
}

export interface OperationCall {
  audience: string;
  key: string;
  input: unknown;
}

type OperationHandler = (input: unknown) => OperationReply | Promise<OperationReply>;

/** Declared problem body; its free text doubles as a disclosure canary. */
export function problemBody(status: number, extra: Record<string, unknown> = {}) {
  return {
    type: "about:blank",
    title: "Problem canary",
    status,
    detail: "internal-detail-canary",
    instance: "/internal-instance-canary",
    traceId: "a".repeat(32),
    ...extra,
  };
}

/**
 * An in-memory operation network for jsdom page tests. Requests and responses still pass through
 * the generated contracts, so malformed bodies and undeclared statuses fail exactly as in production.
 */
export function createOperationNetwork() {
  const handlers = new Map<string, OperationHandler>();
  const calls: OperationCall[] = [];
  return {
    calls,
    on(key: string, handler: OperationHandler) {
      handlers.set(key, handler);
    },
    reset() {
      handlers.clear();
      calls.length = 0;
    },
    count(key: string) {
      return calls.filter((call) => call.key === key).length;
    },
    async execute(
      client: AudienceClient,
      operation: RequestContract,
      input: unknown,
      refusal: new (operation: RequestContract, status: number, problem: unknown) => Error,
    ) {
      calls.push({
        audience: client.audience,
        key: operation.key,
        input: operation.parseRequest(input),
      });
      const handler = handlers.get(operation.key);
      if (!handler) throw new Error(`Unexpected operation ${operation.key}`);
      const reply = await handler(input);
      const result = operation.parseResponse(reply.status, reply.body, reply.body !== undefined);
      if (reply.status >= 400) throw new refusal(operation, reply.status, result);
      return result;
    },
  };
}
