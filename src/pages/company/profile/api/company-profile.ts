import {
  companyReadQuery,
  companyOrganizationOperations as operations,
  requestCompanyOperation,
} from "@/shared/api";
import type { OrganizationProfileUpdate } from "../model/company-profile-update";

export function companyProfileQueries(userPublicId: string) {
  return {
    profile: companyReadQuery(userPublicId, operations.profile),
    setup: companyReadQuery(userPublicId, operations.setup),
    activation: companyReadQuery(userPublicId, operations.activation),
    registry: companyReadQuery(userPublicId, operations.registry),
  };
}

/** Saves the organization profile. Never retried: an unconfirmed save reconciles first. */
export function updateOrganizationProfile(body: OrganizationProfileUpdate) {
  return requestCompanyOperation(operations.updateProfile, { body });
}
