import { operation as remove } from "./generated/platform/delete-api-v1-platform-leads-publicid";
import { operation as removeActivity } from "./generated/platform/delete-api-v1-platform-leads-publicid-activities-activitypublicid";
import { operation as removeContact } from "./generated/platform/delete-api-v1-platform-leads-publicid-contacts-contactpublicid";
import { operation as requests } from "./generated/platform/get-api-v1-platform-lead-conversion-requests";
import { operation as request } from "./generated/platform/get-api-v1-platform-lead-conversion-requests-publicid";
import { operation as delivery } from "./generated/platform/get-api-v1-platform-lead-conversion-requests-publicid-onboarding-delivery";
import { operation as leads } from "./generated/platform/get-api-v1-platform-leads";
import { operation as domain } from "./generated/platform/get-api-v1-platform-leads-leadpublicid-sending-domain";
import { operation as readiness } from "./generated/platform/get-api-v1-platform-leads-leadpublicid-sending-domain-readiness";
import { operation as lead } from "./generated/platform/get-api-v1-platform-leads-publicid";
import { operation as activities } from "./generated/platform/get-api-v1-platform-leads-publicid-activities";
import { operation as eligibility } from "./generated/platform/get-api-v1-platform-leads-publicid-conversion-eligibility";
import { operation as plans } from "./generated/platform/get-api-v1-platform-plans";
import { operation as changePlan } from "./generated/platform/patch-api-v1-platform-lead-conversion-requests-publicid-plan";
import { operation as update } from "./generated/platform/patch-api-v1-platform-leads-publicid";
import { operation as updateContact } from "./generated/platform/patch-api-v1-platform-leads-publicid-contacts-contactpublicid";
import { operation as submit } from "./generated/platform/post-api-v1-platform-lead-conversion-requests";
import { operation as immediate } from "./generated/platform/post-api-v1-platform-lead-conversion-requests-immediate";
import { operation as approve } from "./generated/platform/post-api-v1-platform-lead-conversion-requests-publicid-approve";
import { operation as retryDelivery } from "./generated/platform/post-api-v1-platform-lead-conversion-requests-publicid-onboarding-delivery-retry";
import { operation as reject } from "./generated/platform/post-api-v1-platform-lead-conversion-requests-publicid-reject";
import { operation as create } from "./generated/platform/post-api-v1-platform-leads";
import { operation as provision } from "./generated/platform/post-api-v1-platform-leads-leadpublicid-sending-domain";
import { operation as verify } from "./generated/platform/post-api-v1-platform-leads-leadpublicid-sending-domain-verify";
import { operation as addActivity } from "./generated/platform/post-api-v1-platform-leads-publicid-activities";
import { operation as archive } from "./generated/platform/post-api-v1-platform-leads-publicid-archive";
import { operation as addContact } from "./generated/platform/post-api-v1-platform-leads-publicid-contacts";
import { operation as unarchive } from "./generated/platform/post-api-v1-platform-leads-publicid-unarchive";

/** S8's 27 contracts, plus active-plan discovery supplied by the Platform plan catalogue. */
export const platformLeadOperations = {
  leads,
  lead,
  create,
  update,
  remove,
  archive,
  unarchive,
  eligibility,
  addContact,
  updateContact,
  removeContact,
  activities,
  addActivity,
  removeActivity,
  domain,
  readiness,
  provision,
  verify,
  requests,
  request,
  submit,
  immediate,
  changePlan,
  approve,
  reject,
  delivery,
  retryDelivery,
  plans,
};
