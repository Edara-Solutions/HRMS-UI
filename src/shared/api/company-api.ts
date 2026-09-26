import type { CompanySession } from "../auth/company-session";
import { useCompanySession } from "../auth/company-session";
import { companyApiClient } from "./company-client";
import { operation as companyMe } from "./generated/company/get-api-v1-company-me";
import type { Request as CompanyLoginRequest } from "./generated/company/post-api-v1-company-auth-login";
import { operation as companyLogin } from "./generated/company/post-api-v1-company-auth-login";
import { ContractViolation } from "./generated/runtime";
import { executeOperationRequest } from "./operation-request";

export { companyApiClient as companyApi } from "./company-client";

export async function loadCompanyIdentity(skipRefresh = false) {
  const expected = useCompanySession.getState().session?.user;
  const body = await executeOperationRequest(companyApiClient, companyMe, {}, { skipRefresh });
  const user = companyMe.responses["200"].parse(body);
  if (
    expected &&
    (user.publicId !== expected.publicId || user.companyPublicId !== expected.companyPublicId)
  )
    throw new ContractViolation({
      audience: companyMe.audience,
      key: companyMe.key,
      status: 200,
      phase: "response",
    });
  return user;
}

export async function loginCompany(
  credentials: CompanyLoginRequest["body"],
): Promise<CompanySession> {
  const tokenBody = await executeOperationRequest(companyApiClient, companyLogin, {
    body: { ...credentials, clientType: "web" },
  });
  const tokens = companyLogin.responses["200"].parse(tokenBody);
  const meBody = await executeOperationRequest(
    companyApiClient,
    companyMe,
    {},
    {
      accessToken: tokens.accessToken,
    },
  );
  const user = companyMe.responses["200"].parse(meBody);
  if (user.companyCode.toLowerCase() !== credentials.companyCode.toLowerCase())
    throw new ContractViolation({
      audience: companyMe.audience,
      key: companyMe.key,
      status: 200,
      phase: "response",
    });
  return { ...tokens, user };
}
