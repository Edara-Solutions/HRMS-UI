// Public consumers never enter the authenticated API segment's export graph.

export type { Request as PublicPlansRequest } from "../api/generated/public/get-api-v1-public-plans";
export { ContractViolation } from "../api/generated/runtime";
export { executePublicRequest } from "../api/public-api";

export async function loadPublicPlansContract() {
  return import("../api/generated/public/get-api-v1-public-plans");
}
