import {
  companyAccessPolicyQuery,
  companyEmailReadinessQuery,
  companyOverviewQuery,
  companyReadQuery,
  companyOrganizationOperations as operations,
} from "@/shared/api";

export function companyDashboardQueries(userPublicId: string) {
  return {
    overview: companyOverviewQuery(userPublicId, "recentActivity"),
    registry: companyReadQuery(userPublicId, operations.registry),
    subscription: companyReadQuery(userPublicId, operations.subscription),
    accessPolicy: companyAccessPolicyQuery(userPublicId),
    emailReadiness: companyEmailReadinessQuery(userPublicId),
  };
}
