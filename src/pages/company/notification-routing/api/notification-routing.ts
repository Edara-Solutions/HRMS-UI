import { queryOptions } from "@tanstack/react-query";
import {
  companyCommunicationsOperations as communications,
  companyQueryKey,
  companyReadQuery,
  companyPeopleOperations as people,
  requestCompanyOperation,
  sendCompanyCommand,
} from "@/shared/api";
import type { RoutingOverride } from "../model/notification-routing";

export function routingQueries(userPublicId: string) {
  return {
    settings: companyReadQuery(userPublicId, communications.notificationSettings),
    /** Role selectors route by role name, so the Company role catalogue supplies the choices. */
    roles: queryOptions({
      queryKey: companyQueryKey(userPublicId, people.roles, "routing"),
      queryFn: ({ signal }) =>
        requestCompanyOperation(people.roles, { query: { page: 1, pageSize: 100 } }, signal),
    }),
    /** Permission selectors resolve against the Company permission catalogue only. */
    permissions: companyReadQuery(userPublicId, people.permissionCatalogue),
  };
}

/** Replaces one type's override; `null` returns the type to its declared default audience. */
export function setRouting(typeKey: string, override: RoutingOverride) {
  return sendCompanyCommand(communications.updateNotificationRouting, {
    params: { typeKey },
    body: { override },
  });
}
