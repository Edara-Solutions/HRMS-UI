import { type ContractAudience, ContractViolation } from "./generated/runtime";

export interface ResponseContract {
  audience: ContractAudience;
  key: string;
  parseResponse: (status: number, body: unknown, hasBody?: boolean) => unknown;
}

export async function readOperationResponse(
  operation: ResponseContract,
  response: Response,
): Promise<unknown> {
  const text = await response.text();
  let body: unknown;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ContractViolation({
        audience: operation.audience,
        key: operation.key,
        status: response.status,
        phase: "response",
      });
    }
  }
  return operation.parseResponse(response.status, body, text.length > 0);
}
