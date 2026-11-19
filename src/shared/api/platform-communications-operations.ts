import { operation as announcements } from "./generated/platform/get-api-v1-platform-announcements";
import { operation as auditTrail } from "./generated/platform/get-api-v1-platform-audit-trail";
import { operation as auditActors } from "./generated/platform/get-api-v1-platform-audit-trail-actors";
import { operation as variantRemovalReadiness } from "./generated/platform/get-api-v1-platform-email-template-variants-key-removal-readiness";
import { operation as emailTypes } from "./generated/platform/get-api-v1-platform-email-types";
import { operation as emailType } from "./generated/platform/get-api-v1-platform-email-types-key";
import { operation as emailPreview } from "./generated/platform/get-api-v1-platform-email-types-key-preview";
import { operation as emailVariants } from "./generated/platform/get-api-v1-platform-email-types-key-variants";
import { operation as deliveries } from "./generated/platform/get-api-v1-platform-emails-deliveries";
import { operation as delivery } from "./generated/platform/get-api-v1-platform-emails-deliveries-context-publicid";
import { operation as sendingStatus } from "./generated/platform/get-api-v1-platform-emails-sending";
import { operation as notificationSettings } from "./generated/platform/get-api-v1-platform-notification-settings";
import { operation as createAnnouncement } from "./generated/platform/post-api-v1-platform-announcements";
import { operation as migrateVariant } from "./generated/platform/post-api-v1-platform-email-template-variants-key-migrate";
import { operation as cancelDelivery } from "./generated/platform/post-api-v1-platform-emails-deliveries-context-publicid-cancel";
import { operation as retryDelivery } from "./generated/platform/post-api-v1-platform-emails-deliveries-context-publicid-retry";
import { operation as pauseSending } from "./generated/platform/post-api-v1-platform-emails-sending-context-pause";
import { operation as resumeSending } from "./generated/platform/post-api-v1-platform-emails-sending-context-resume";
import { operation as testSend } from "./generated/platform/post-api-v1-platform-emails-test-send";
import { operation as updateNotificationRouting } from "./generated/platform/put-api-v1-platform-notification-settings-typekey";

/** Generated Platform communications, announcements, email and audit operations. Pages own their workflows. */
export const platformCommunicationsOperations = {
  announcements,
  createAnnouncement,
  notificationSettings,
  updateNotificationRouting,
  auditTrail,
  auditActors,
  emailTypes,
  emailType,
  emailPreview,
  emailVariants,
  variantRemovalReadiness,
  migrateVariant,
  testSend,
  deliveries,
  delivery,
  cancelDelivery,
  retryDelivery,
  sendingStatus,
  pauseSending,
  resumeSending,
};
