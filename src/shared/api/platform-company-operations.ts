import { operation as remove } from "./generated/platform/delete-api-v1-platform-companies-publicid";
import { operation as companies } from "./generated/platform/get-api-v1-platform-companies";
import { operation as cursor } from "./generated/platform/get-api-v1-platform-companies-cursor";
import { operation as company } from "./generated/platform/get-api-v1-platform-companies-publicid";
import { operation as policy } from "./generated/platform/get-api-v1-platform-companies-publicid-access-policy";
import { operation as activation } from "./generated/platform/get-api-v1-platform-companies-publicid-activation";
import { operation as commercial } from "./generated/platform/get-api-v1-platform-companies-publicid-commercial-config";
import { operation as subscription } from "./generated/platform/get-api-v1-platform-companies-publicid-subscription";
import { operation as update } from "./generated/platform/patch-api-v1-platform-companies-publicid";
import { operation as updatePolicy } from "./generated/platform/patch-api-v1-platform-companies-publicid-access-policy";
import { operation as extendTrial } from "./generated/platform/patch-api-v1-platform-companies-publicid-subscription-trial";
import { operation as create } from "./generated/platform/post-api-v1-platform-companies";
import { operation as evaluate } from "./generated/platform/post-api-v1-platform-companies-publicid-activation-evaluate";
import { operation as freeze } from "./generated/platform/post-api-v1-platform-companies-publicid-freeze";
import { operation as restore } from "./generated/platform/post-api-v1-platform-companies-publicid-restore";
import { operation as suspend } from "./generated/platform/post-api-v1-platform-companies-publicid-suspend";
import { operation as unfreeze } from "./generated/platform/post-api-v1-platform-companies-publicid-unfreeze";
import { operation as unsuspend } from "./generated/platform/post-api-v1-platform-companies-publicid-unsuspend";
import { operation as expireTrials } from "./generated/platform/post-api-v1-platform-company-subscriptions-expire-trials";

/** Direct Platform contracts shared by the registry, Company workspace and global trial run. */
export const platformCompanyOperations = {
  companies,
  cursor,
  company,
  create,
  update,
  remove,
  freeze,
  unfreeze,
  suspend,
  unsuspend,
  restore,
  policy,
  updatePolicy,
  activation,
  evaluate,
  commercial,
  subscription,
  extendTrial,
  expireTrials,
};
