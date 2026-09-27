import { operation as deleteTemplateAssignment } from "./generated/company/delete-api-v1-company-email-template-assignments-emailtypekey";
import { operation as auditTrail } from "./generated/company/get-api-v1-company-audit-trail";
import { operation as auditActors } from "./generated/company/get-api-v1-company-audit-trail-actors";
import { operation as emailSettings } from "./generated/company/get-api-v1-company-email-settings";
import { operation as templateAssignments } from "./generated/company/get-api-v1-company-email-template-assignments";
import { operation as effectiveTemplate } from "./generated/company/get-api-v1-company-email-template-assignments-emailtypekey-effective";
import { operation as emailTypes } from "./generated/company/get-api-v1-company-email-types";
import { operation as emailType } from "./generated/company/get-api-v1-company-email-types-key";
import { operation as emailPreview } from "./generated/company/get-api-v1-company-email-types-key-preview";
import { operation as emailVariants } from "./generated/company/get-api-v1-company-email-types-key-variants";
import { operation as notificationSettings } from "./generated/company/get-api-v1-company-notification-settings";
import { operation as sendingDomain } from "./generated/company/get-api-v1-company-sending-domain";
import { operation as sendingDomainReadiness } from "./generated/company/get-api-v1-company-sending-domain-readiness";
import { operation as assignTemplate } from "./generated/company/post-api-v1-company-email-template-assignments";
import { operation as testSend } from "./generated/company/post-api-v1-company-emails-test-send";
import { operation as createSendingDomain } from "./generated/company/post-api-v1-company-sending-domain";
import { operation as verifySendingDomain } from "./generated/company/post-api-v1-company-sending-domain-verify";
import { operation as updateEmailSettings } from "./generated/company/put-api-v1-company-email-settings";
import { operation as updateNotificationRouting } from "./generated/company/put-api-v1-company-notification-settings-typekey";

/** Generated Company communications, routing and audit operations. Pages own their workflows. */
export const companyCommunicationsOperations = {
  emailSettings,
  updateEmailSettings,
  sendingDomain,
  createSendingDomain,
  verifySendingDomain,
  sendingDomainReadiness,
  emailTypes,
  emailType,
  emailVariants,
  emailPreview,
  templateAssignments,
  assignTemplate,
  deleteTemplateAssignment,
  effectiveTemplate,
  testSend,
  notificationSettings,
  updateNotificationRouting,
  auditTrail,
  auditActors,
};
