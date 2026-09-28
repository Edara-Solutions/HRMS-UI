import { companyApiClient } from "@/shared/api/company-client";
import type { SuccessResponse as CompanyRefreshResponse } from "@/shared/api/generated/company/post-api-v1-company-auth-refresh";
import { operation as refreshOperation } from "@/shared/api/generated/company/post-api-v1-company-auth-refresh";
import { executeOperationRequest } from "../api/operation-request";
import { useCompanySession } from "./company-session";

export async function refreshCompanyTokens(refreshToken: string): Promise<CompanyRefreshResponse> {
  const companyPublicId = useCompanySession.getState().session?.user.companyPublicId;
  if (!companyPublicId) throw new Error("Company session scope is unavailable");
  const body = await executeOperationRequest(companyApiClient, refreshOperation, {
    body: { companyPublicId, refreshToken },
  });
  return refreshOperation.responses["200"].parse(body);
}
