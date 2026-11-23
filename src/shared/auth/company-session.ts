import { z } from "zod";
import { companyQueryClient } from "@/shared/api/company-query-client";
import type { SuccessResponse as CompanyMeUser } from "@/shared/api/generated/company/get-api-v1-company-me";
import { responseSchemas as meSchemas } from "@/shared/api/generated/company/get-api-v1-company-me";
import { responseSchemas as tokenSchemas } from "@/shared/api/generated/company/post-api-v1-company-auth-login";
import { type AudienceSession, createAudienceSessionStore } from "./audience-session";
import { clearCredentialContext } from "./credential-context";

export type CompanyUser = CompanyMeUser;
export type CompanySession = AudienceSession<CompanyUser>;
export type CompanyDelegation = NonNullable<CompanyUser["delegation"]>;

export function supportSessionPath(accessSessionPublicId: string) {
  return `/platform/access-sessions/${accessSessionPublicId}`;
}

export function isSupportDelegate(user: CompanyUser | undefined): boolean {
  return user?.delegation !== undefined;
}

export function dropSupportAccess(accessSessionPublicId: string) {
  const delegation = useCompanySession.getState().session?.user.delegation;
  if (delegation?.accessSessionPublicId === accessSessionPublicId)
    useCompanySession.getState().clearSession();
}

function returnToSupportSession(delegation: CompanyDelegation | undefined) {
  const sessionId = z.string().uuid().safeParse(delegation?.accessSessionPublicId);
  if (sessionId.success) {
    window.location.assign(supportSessionPath(sessionId.data));
  }
}

export function endSupportAccess() {
  const delegation = useCompanySession.getState().session?.user.delegation;
  useCompanySession.getState().clearSession();
  returnToSupportSession(delegation);
}

const companyCredentialPaths = [
  "/company/accept-invitation",
  "/company/change-password",
  "/company/forgot-password",
  "/company/login",
  "/company/reset-password",
];

function isCompanyPortalPath(pathname: string) {
  return (
    (pathname === "/company" || pathname.startsWith("/company/")) &&
    !companyCredentialPaths.includes(pathname)
  );
}

function leaveEndedSupportAccess(previous: CompanySession | null, next: CompanySession | null) {
  if (!next && isCompanyPortalPath(window.location.pathname)) {
    returnToSupportSession(previous?.user.delegation);
  }
}

export function useCompanyDelegation(): CompanyDelegation | null {
  return useCompanySession((state) => state.session?.user.delegation ?? null);
}

export const useCompanySession = createAudienceSessionStore<CompanyUser>(
  "company",
  "hrms-company-session:v1",
  tokenSchemas["200"].extend({
    user: meSchemas["200"],
  }),
  () => {
    companyQueryClient.clear();
    clearCredentialContext("company");
  },
  leaveEndedSupportAccess,
);
