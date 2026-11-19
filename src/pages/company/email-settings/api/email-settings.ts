import { queryOptions } from "@tanstack/react-query";
import {
  companyEmailReadinessQuery,
  companyQueryKey,
  companyReadQuery,
  OperationRefusal,
  companyCommunicationsOperations as operations,
  requestCompanyOperation,
} from "@/shared/api";
import type { EmailSettingsBody } from "../model/email-settings";

/** Every email-settings read, keyed under the live identity. */
export function emailSettingsQueries(userPublicId: string) {
  return {
    settings: companyReadQuery(userPublicId, operations.emailSettings),
    readiness: companyEmailReadinessQuery(userPublicId),
    domainReadiness: companyReadQuery(userPublicId, operations.sendingDomainReadiness),
    domain: queryOptions({
      queryKey: companyQueryKey(userPublicId, operations.sendingDomain),
      // No sending domain yet is a declared 404 on this read: the "not configured" state.
      queryFn: async ({ signal }) => {
        try {
          return await requestCompanyOperation(operations.sendingDomain, {}, signal);
        } catch (error) {
          if (error instanceof OperationRefusal && error.status === 404 && !error.code) return null;
          throw error;
        }
      },
    }),
  };
}

/** Everything a settings or domain change can make stale for this identity. */
export function emailSettingsRoots(userPublicId: string) {
  return [
    companyQueryKey(userPublicId, operations.emailSettings),
    companyQueryKey(userPublicId, operations.sendingDomain),
    companyQueryKey(userPublicId, operations.sendingDomainReadiness),
    emailSettingsQueries(userPublicId).readiness.queryKey,
  ];
}

/** Replaces the sender and branding settings as a whole. */
export function saveEmailSettings(body: EmailSettingsBody) {
  return requestCompanyOperation(operations.updateEmailSettings, { body });
}

export function createSendingDomain(domain: string) {
  return requestCompanyOperation(operations.createSendingDomain, { body: { domain } });
}

/** Re-checks DNS for the Company's own domain. The body is empty: nothing can change ownership. */
export function verifySendingDomain() {
  return requestCompanyOperation(operations.verifySendingDomain, {});
}
