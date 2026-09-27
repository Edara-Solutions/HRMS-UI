import {
  companyAccessPolicyQuery,
  companyEmailReadinessQuery,
  companyReadQuery,
  companyOrganizationOperations as operations,
} from "@/shared/api";

/** Every dashboard read. Company scope is session-derived; each read is keyed by the live identity. */
export function companyDashboardQueries(userPublicId: string) {
  return {
    registry: companyReadQuery(userPublicId, operations.registry),
    activation: companyReadQuery(userPublicId, operations.activation),
    subscription: companyReadQuery(userPublicId, operations.subscription),
    accessPolicy: companyAccessPolicyQuery(userPublicId),
    setup: companyReadQuery(userPublicId, operations.setup),
    emailReadiness: companyEmailReadinessQuery(userPublicId),
  };
}
