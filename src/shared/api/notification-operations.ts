import { operation as companyFeed } from "./generated/company/get-api-v1-company-notifications";
import { operation as companyCount } from "./generated/company/get-api-v1-company-notifications-unread-count";
import { operation as companyRead } from "./generated/company/post-api-v1-company-notifications-read";
import { operation as companySeen } from "./generated/company/post-api-v1-company-notifications-seen";
import { operation as platformFeed } from "./generated/platform/get-api-v1-platform-notifications";
import { operation as platformCount } from "./generated/platform/get-api-v1-platform-notifications-unread-count";
import { operation as platformRead } from "./generated/platform/post-api-v1-platform-notifications-read";
import { operation as platformSeen } from "./generated/platform/post-api-v1-platform-notifications-seen";

/** Generated SELF notification lifecycle operations, one set per audience. */
export const companyNotificationOperations = {
  feed: companyFeed,
  count: companyCount,
  seen: companySeen,
  read: companyRead,
};

/** The Platform audience's matching set; Platform mounting belongs to its own slice. */
export const platformNotificationOperations = {
  feed: platformFeed,
  count: platformCount,
  seen: platformSeen,
  read: platformRead,
};
