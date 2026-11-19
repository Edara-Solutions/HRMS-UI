import { companyQueryClient } from "@/shared/api/company-query-client";
import type { SuccessResponse as CompanyMeUser } from "@/shared/api/generated/company/get-api-v1-company-me";
import { responseSchemas as meSchemas } from "@/shared/api/generated/company/get-api-v1-company-me";
import { responseSchemas as tokenSchemas } from "@/shared/api/generated/company/post-api-v1-company-auth-login";
import { type AudienceSession, createAudienceSessionStore } from "./audience-session";
import { clearCredentialContext } from "./credential-context";

export type CompanyUser = CompanyMeUser;
export type CompanySession = AudienceSession<CompanyUser>;

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
);
