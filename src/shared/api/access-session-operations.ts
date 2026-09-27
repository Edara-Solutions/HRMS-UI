import { operation as unassignTemplate } from "./generated/delegated/delete-api-v1-platform-access-sessions-sessionpublicid-email-template-assignments-emailtypekey";
import { operation as auditTrail } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-audit-trail";
import { operation as emailReadiness } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-email-readiness";
import { operation as emailSettings } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-email-settings";
import { operation as templateAssignments } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-email-template-assignments";
import { operation as profile } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-profile";
import { operation as roles } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-roles";
import { operation as role } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-roles-rolepublicid";
import { operation as sendingDomain } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-sending-domain";
import { operation as setup } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-setup";
import { operation as users } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-users";
import { operation as user } from "./generated/delegated/get-api-v1-platform-access-sessions-sessionpublicid-users-userpublicid";
import { operation as updateProfile } from "./generated/delegated/patch-api-v1-platform-access-sessions-sessionpublicid-profile";
import { operation as updateUser } from "./generated/delegated/patch-api-v1-platform-access-sessions-sessionpublicid-users-userpublicid";
import { operation as assignTemplate } from "./generated/delegated/post-api-v1-platform-access-sessions-sessionpublicid-email-template-assignments";
import { operation as completeStep } from "./generated/delegated/post-api-v1-platform-access-sessions-sessionpublicid-setup-steppublicid-complete";
import { operation as skipStep } from "./generated/delegated/post-api-v1-platform-access-sessions-sessionpublicid-setup-steppublicid-skip";
import { operation as startStep } from "./generated/delegated/post-api-v1-platform-access-sessions-sessionpublicid-setup-steppublicid-start";
import { operation as updateEmailSettings } from "./generated/delegated/put-api-v1-platform-access-sessions-sessionpublicid-email-settings";
import { operation as session } from "./generated/platform/get-api-v1-platform-access-sessions-sessionpublicid";
import { operation as open } from "./generated/platform/post-api-v1-platform-access-sessions";
import { operation as close } from "./generated/platform/post-api-v1-platform-access-sessions-sessionpublicid-close";

export const accessSessionOperations = { open, session, close };

export const delegatedCompanyOperations = {
  users,
  user,
  updateUser,
  roles,
  role,
  profile,
  updateProfile,
  setup,
  startStep,
  completeStep,
  skipStep,
  emailSettings,
  updateEmailSettings,
  emailReadiness,
  templateAssignments,
  assignTemplate,
  unassignTemplate,
  sendingDomain,
  auditTrail,
};
