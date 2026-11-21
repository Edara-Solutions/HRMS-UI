import { operation as auditTrail } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-audit-trail";
import { operation as diagnosticResult } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-email-diagnostics-test-sends-requestid";
import { operation as diagnosticTypes } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-email-diagnostics-types";
import { operation as diagnosticPreview } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-email-diagnostics-types-key-preview";
import { operation as diagnosticSend } from "./generated/delegated/post-api-v1-platform-access-sessions-sessionpublicid-email-diagnostics-test-sends";
import { operation as reviewRequests } from "./generated/platform/get-api-v1-platform-access-requests";
import { operation as ownRequests } from "./generated/platform/get-api-v1-platform-access-requests-mine";
import { operation as liveSessions } from "./generated/platform/get-api-v1-platform-access-sessions-live";
import { operation as session } from "./generated/platform/get-api-v1-platform-access-sessions-sessionpublicid";
import { operation as submitRequest } from "./generated/platform/post-api-v1-platform-access-requests";
import { operation as approveRequest } from "./generated/platform/post-api-v1-platform-access-requests-requestpublicid-approve";
import { operation as cancelRequest } from "./generated/platform/post-api-v1-platform-access-requests-requestpublicid-cancel";
import { operation as rejectRequest } from "./generated/platform/post-api-v1-platform-access-requests-requestpublicid-reject";
import { operation as open } from "./generated/platform/post-api-v1-platform-access-sessions";
import { operation as close } from "./generated/platform/post-api-v1-platform-access-sessions-sessionpublicid-close";
import { operation as end } from "./generated/platform/post-api-v1-platform-access-sessions-sessionpublicid-end";
import { operation as enter } from "./generated/platform/post-api-v1-platform-access-sessions-sessionpublicid-enter";

export const accessSessionOperations = { open, session, enter, close, end, liveSessions };

export const accessRequestOperations = {
  submitRequest,
  ownRequests,
  reviewRequests,
  cancelRequest,
  approveRequest,
  rejectRequest,
};

export const delegatedCompanyOperations = {
  diagnosticTypes,
  diagnosticPreview,
  diagnosticSend,
  diagnosticResult,
  auditTrail,
};
