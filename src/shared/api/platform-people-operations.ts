import { operation as revokeAssignment } from "./generated/platform/delete-api-v1-platform-role-assignments-assignmentpublicid";
import { operation as deleteRole } from "./generated/platform/delete-api-v1-platform-roles-rolepublicid";
import { operation as deleteUser } from "./generated/platform/delete-api-v1-platform-users-publicid";
import { operation as revokeUserSessions } from "./generated/platform/delete-api-v1-platform-users-publicid-sessions";
import { operation as revokeUserSession } from "./generated/platform/delete-api-v1-platform-users-publicid-sessions-sessionpublicid";
import { operation as assignments } from "./generated/platform/get-api-v1-platform-role-assignments";
import { operation as roles } from "./generated/platform/get-api-v1-platform-roles";
import { operation as users } from "./generated/platform/get-api-v1-platform-users";
import { operation as user } from "./generated/platform/get-api-v1-platform-users-publicid";
import { operation as userSessions } from "./generated/platform/get-api-v1-platform-users-publicid-sessions";
import { operation as updateRole } from "./generated/platform/patch-api-v1-platform-roles-rolepublicid";
import { operation as updateUser } from "./generated/platform/patch-api-v1-platform-users-publicid";
import { operation as assignRole } from "./generated/platform/post-api-v1-platform-role-assignments";
import { operation as createRole } from "./generated/platform/post-api-v1-platform-roles";
import { operation as inviteUser } from "./generated/platform/post-api-v1-platform-users";
import { operation as reissueInvitation } from "./generated/platform/post-api-v1-platform-users-publicid-invitation";
import { operation as forceRecovery } from "./generated/platform/post-api-v1-platform-users-publicid-password-reset";
import { operation as suspendUser } from "./generated/platform/post-api-v1-platform-users-publicid-suspend";
import { operation as unsuspendUser } from "./generated/platform/post-api-v1-platform-users-publicid-unsuspend";

/** Generated Platform roster, session and authority operations. Pages own the workflows built on them. */
export const platformPeopleOperations = {
  users,
  user,
  inviteUser,
  updateUser,
  deleteUser,
  suspendUser,
  unsuspendUser,
  reissueInvitation,
  forceRecovery,
  userSessions,
  revokeUserSession,
  revokeUserSessions,
  roles,
  createRole,
  updateRole,
  deleteRole,
  assignments,
  assignRole,
  revokeAssignment,
};
