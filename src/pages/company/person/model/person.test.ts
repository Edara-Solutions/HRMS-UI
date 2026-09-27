import { describe, expect, it } from "vitest";
import { companyPeopleOperations as operations } from "@/shared/api";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import {
  assignmentBody,
  peopleIds,
  personBody,
  rolesBody,
} from "../../../../test/company-people-fixtures";
import { buildPersonUpdate, personTarget, targetFacts, toPersonForm } from "./person";

const person = operations.user.responses["200"].parse(personBody(peopleIds.colleague));
const roles = operations.roles.responses["200"].parse(rolesBody()).items;
const actor = companySessionFixture({ publicId: peopleIds.actor }).user;

describe("person update", () => {
  it("sends only edited allow-listed fields and clears optional text to null", () => {
    const values = { ...toPersonForm(person), phone: "", level: "L3", firstName: "Omar" };
    expect(buildPersonUpdate(values, { phone: true, level: true })).toEqual({
      phone: null,
      level: "L3",
    });
  });

  it("cannot express Company, credential, role, Owner or deletion fields", () => {
    const update = buildPersonUpdate(toPersonForm(person), {
      firstName: true,
      lastName: true,
      email: true,
      employeeCode: true,
      phone: true,
      level: true,
      hireDate: true,
      status: true,
      employmentType: true,
      workLocation: true,
    });
    expect(Object.keys(update).sort()).toEqual(
      [
        "email",
        "employeeCode",
        "employmentType",
        "firstName",
        "hireDate",
        "lastName",
        "level",
        "phone",
        "status",
        "workLocation",
      ].sort(),
    );
    expect(
      operations.updateUser.requestSchema.safeParse({
        params: { publicId: person.publicId },
        body: { ...update, companyPublicId: "x", password: "x", rolePublicId: "x", isOwner: true },
      }).success,
    ).toBe(false);
  });
});

describe("target predicates", () => {
  it("recognises the Owner from the role catalogue and self from the session", () => {
    const owned = operations.userRole.responses["200"].parse(
      assignmentBody(person.publicId, peopleIds.ownerRole),
    );
    expect(personTarget(actor, person, owned, roles)).toEqual({ self: false, owner: true });
    expect(personTarget(actor, person, null, roles)).toEqual({ self: false, owner: false });
    const self = operations.user.responses["200"].parse(personBody(peopleIds.actor));
    expect(personTarget(actor, self, null, roles).self).toBe(true);
  });

  it("keeps self, Owner continuity and Owner-only transfer as distinct facts", () => {
    expect(targetFacts({ self: true, owner: false }, "password-reset")).toEqual({
      target: { self: true },
    });
    expect(targetFacts({ self: false, owner: true }, "delete")).toEqual({
      target: { self: false, preservesOwner: false },
    });
    expect(targetFacts({ self: false, owner: false }, "transfer")).toEqual({
      requiresOwner: true,
      target: { self: false },
    });
  });
});
