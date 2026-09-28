import { describe, expect, it } from "vitest";
import { companyPeopleOperations as operations } from "@/shared/api";
import { catalogueBody, peopleIds, roleDetailBody } from "../../../../test/company-people-fixtures";
import { grantablePermissionIds, permissionChange } from "./role";

const role = operations.role.responses["200"].parse(
  roleDetailBody(peopleIds.managerRole, [peopleIds.permissionRead]),
);
const catalogue = operations.permissionCatalogue.responses["200"].parse(catalogueBody());

describe("role permission replacement", () => {
  it("counts additions and removals against the replacement actually sent", () => {
    expect(permissionChange(role, catalogue, new Set([peopleIds.permissionWrite]))).toEqual({
      added: 1,
      removed: 1,
    });
    const retired = operations.role.responses["200"].parse(
      roleDetailBody(peopleIds.managerRole, [
        peopleIds.permissionRead,
        peopleIds.retiredPermission,
      ]),
    );
    expect(
      permissionChange(
        retired,
        catalogue,
        new Set([peopleIds.permissionRead, peopleIds.retiredPermission]),
      ),
    ).toEqual({ added: 0, removed: 1 });
  });

  it("grants only permissions the Company catalogue lists", () => {
    expect(
      grantablePermissionIds(
        catalogue,
        new Set([peopleIds.permissionWrite, peopleIds.retiredPermission]),
      ),
    ).toEqual([peopleIds.permissionWrite]);
  });
});
