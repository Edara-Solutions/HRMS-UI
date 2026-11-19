import { operation as deleteRole } from "./generated/company/delete-api-v1-company-roles-publicid";
import { operation as deleteUsers } from "./generated/company/delete-api-v1-company-users-bulk";
import { operation as deleteUser } from "./generated/company/delete-api-v1-company-users-publicid";
import { operation as revokeUserRole } from "./generated/company/delete-api-v1-company-users-publicid-role";
import { operation as revokeUserSession } from "./generated/company/delete-api-v1-company-users-publicid-sessions-sessionpublicid";
import { operation as permissionCatalogue } from "./generated/company/get-api-v1-company-permissions";
import { operation as roles } from "./generated/company/get-api-v1-company-roles";
import { operation as role } from "./generated/company/get-api-v1-company-roles-publicid";
import { operation as users } from "./generated/company/get-api-v1-company-users";
import { operation as employeeCode } from "./generated/company/get-api-v1-company-users-generate-code";
import { operation as user } from "./generated/company/get-api-v1-company-users-publicid";
import { operation as userRole } from "./generated/company/get-api-v1-company-users-publicid-role";
import { operation as userSessions } from "./generated/company/get-api-v1-company-users-publicid-sessions";
import { operation as updateRole } from "./generated/company/patch-api-v1-company-roles-publicid";
import { operation as updateUsers } from "./generated/company/patch-api-v1-company-users-bulk";
import { operation as updateUser } from "./generated/company/patch-api-v1-company-users-publicid";
import { operation as createRole } from "./generated/company/post-api-v1-company-roles";
import { operation as transferOwnership } from "./generated/company/post-api-v1-company-roles-transfer-ownership";
import { operation as createUser } from "./generated/company/post-api-v1-company-users";
import { operation as createUsers } from "./generated/company/post-api-v1-company-users-bulk";
import { operation as reissueInvitation } from "./generated/company/post-api-v1-company-users-publicid-invitation";
import { operation as resetUserPassword } from "./generated/company/post-api-v1-company-users-publicid-password-reset";
import { operation as assignUserRole } from "./generated/company/post-api-v1-company-users-publicid-role";
import { operation as replaceRolePermissions } from "./generated/company/put-api-v1-company-roles-publicid-permissions";

/** Generated Company people and access-control operations. Pages own the workflows built on them. */
export const companyPeopleOperations = {
  users,
  user,
  employeeCode,
  createUser,
  createUsers,
  updateUser,
  updateUsers,
  deleteUser,
  deleteUsers,
  reissueInvitation,
  resetUserPassword,
  userSessions,
  revokeUserSession,
  userRole,
  assignUserRole,
  revokeUserRole,
  roles,
  role,
  createRole,
  updateRole,
  deleteRole,
  replaceRolePermissions,
  permissionCatalogue,
  transferOwnership,
};
