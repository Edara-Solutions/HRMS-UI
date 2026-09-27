export {
  AudienceSessionChanged,
  requestAudienceOperation,
  sendAudienceCommand,
} from "./audience-operation";
export { apiClient } from "./client";
export {
  isCompanyBlocked,
  useCompanyAccess,
  useCompanyMutationRecovery,
} from "./company-access";
export { companyApi, loadCompanyIdentity, loginCompany } from "./company-api";
export { companyApiClient } from "./company-client";
export { companyCommunicationsOperations } from "./company-communications-operations";
export {
  companyAccessPolicyQuery,
  companyEmailReadinessQuery,
  companyQueryKey,
  companyReadQuery,
  requestCompanyOperation,
  sendCompanyCommand,
} from "./company-operation";
export { companyOrganizationOperations } from "./company-operations";
export { companyPeopleOperations } from "./company-people-operations";
export { companyQueryClient } from "./company-query-client";
export { apiBaseUrl } from "./config";
export {
  type AppError,
  type LoginError,
  type LoginErrorKind,
  mapHttpStatusToAppError,
  mapLoginError,
  readBackendErrorMessage,
} from "./error-mapper";
export type {
  OperationKey,
  OperationPermission,
  RefusalMode,
} from "./generated/authorization";
export { operationAuthorization } from "./generated/authorization";
export { ContractViolation } from "./generated/runtime";
export type {
  components as leadComponents,
  paths as leadPaths,
} from "./lead-contract";
export {
  parseLeadActivityListResponse,
  parseLeadConversionEligibility,
  parseLeadCreateResult,
  parseLeadDetails,
  parseLeadListResponse,
} from "./lead-runtime-contract";
export { classifyMutationFailure, type MutationOutcome } from "./mutation-outcome";
export {
  companyNotificationOperations,
  platformNotificationOperations,
} from "./notification-operations";
export { executeOperationRequest, OperationRefusal } from "./operation-request";
export { readOperationResponse } from "./operation-response";
export {
  platformRootRoleName,
  rootReservedPermissions,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "./platform-access";
export { loadPlatformIdentity, loginPlatform, platformApi } from "./platform-api";
export { platformApiClient } from "./platform-client";
export { platformCompanyOperations } from "./platform-company-operations";
export { platformLeadOperations } from "./platform-lead-operations";
export {
  platformQueryKey,
  platformReadQuery,
  requestPlatformOperation,
  sendPlatformCommand,
} from "./platform-operation";
export { platformPeopleOperations } from "./platform-people-operations";
export { platformPlanOperations } from "./platform-plan-operations";
export { platformQueryClient } from "./platform-query-client";
export { queryClient } from "./query-client";
export type { components, paths } from "./schema";

export async function loadCompanyPasswordContract() {
  return import("./generated/company/post-api-v1-company-me-password");
}

export async function loadPlatformPasswordContract() {
  return import("./generated/platform/post-api-v1-platform-me-password");
}
