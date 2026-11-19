import { operation as activation } from "./generated/company/get-api-v1-company-activation";
import { operation as profile } from "./generated/company/get-api-v1-company-profile";
import { operation as registry } from "./generated/company/get-api-v1-company-registry";
import { operation as setup } from "./generated/company/get-api-v1-company-setup";
import { operation as subscription } from "./generated/company/get-api-v1-company-subscription";
import { operation as updateProfile } from "./generated/company/patch-api-v1-company-profile";
import { operation as completeSetupStep } from "./generated/company/post-api-v1-company-setup-steppublicid-complete";
import { operation as skipSetupStep } from "./generated/company/post-api-v1-company-setup-steppublicid-skip";
import { operation as startSetupStep } from "./generated/company/post-api-v1-company-setup-steppublicid-start";

/** Generated Company organization operations. Pages own the queries and models built on them. */
export const companyOrganizationOperations = {
  registry,
  activation,
  subscription,
  profile,
  updateProfile,
  setup,
  startSetupStep,
  completeSetupStep,
  skipSetupStep,
};
