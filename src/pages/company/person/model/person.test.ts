import { describe, expect, it } from "vitest";
import { companyPeopleOperations as operations } from "@/shared/api";
import { companySessionFixture } from "../../../../test/audience-fixtures";
import {
  lastUsableOwner,
  otherOwner,
  peopleIds,
  personBody,
} from "../../../../test/company-people-fixtures";
import {
  buildPersonUpdate,
  mayBreakOwnerContinuity,
  personTarget,
  statusOptionsFor,
  targetFacts,
  toPersonForm,
} from "./person";

const person = operations.user.responses["200"].parse(personBody(peopleIds.colleague));
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
  it("reads Owner standing from the person's backend eligibility and self from the session", () => {
    const owner = operations.user.responses["200"].parse(
      personBody(peopleIds.owner, lastUsableOwner),
    );
    expect(personTarget(actor, owner)).toEqual({
      self: false,
      holdsOwnerRole: true,
      isLastUsableOwner: true,
    });
    expect(personTarget(actor, person)).toEqual({
      self: false,
      holdsOwnerRole: false,
      isLastUsableOwner: false,
    });
    const self = operations.user.responses["200"].parse(personBody(peopleIds.actor));
    expect(personTarget(actor, self).self).toBe(true);
  });

  it("keeps self, Owner role, last usable Owner and Owner-only transfer as distinct facts", () => {
    const colleague = { self: false, holdsOwnerRole: false, isLastUsableOwner: false };
    const lastOwner = { self: false, ...lastUsableOwner.ownerContinuity };
    const secondOwner = { self: false, ...otherOwner.ownerContinuity };
    expect(targetFacts({ ...colleague, self: true }, "ACTIVE", "password-reset")).toEqual({
      target: { self: true },
    });
    expect(targetFacts(lastOwner, "ACTIVE", "delete")).toEqual({
      target: { self: false, usableOwnerRemains: false },
    });
    expect(targetFacts(secondOwner, "SUSPENDED", "delete")).toEqual({
      target: { self: false, usableOwnerRemains: true },
    });
    expect(targetFacts(secondOwner, "SUSPENDED", "revoke-role")).toEqual({
      target: { self: false, ownerRoleUntouched: false },
    });
    expect(targetFacts(colleague, "ACTIVE", "transfer")).toEqual({
      requiresOwner: true,
      target: { self: false, lifecycleAllowed: true },
    });
    expect(targetFacts(colleague, "SUSPENDED", "transfer")).toEqual({
      requiresOwner: true,
      target: { self: false, lifecycleAllowed: false },
    });
  });

  it("offers the last usable Owner only working statuses", () => {
    const owner = operations.user.responses["200"].parse(
      personBody(peopleIds.owner, lastUsableOwner),
    );
    expect(statusOptionsFor(personTarget(actor, owner))).toEqual([
      "ACTIVE",
      "ONBOARDING",
      "PROBATION",
    ]);
    expect(statusOptionsFor(personTarget(actor, person))).toHaveLength(6);
  });

  it("attributes a refusal to Owner continuity only for writes that can trigger it", () => {
    const owner = personTarget(
      actor,
      operations.user.responses["200"].parse(personBody(peopleIds.owner, otherOwner)),
    );
    const colleague = personTarget(actor, person);
    expect(mayBreakOwnerContinuity(owner, { kind: "delete" })).toBe(true);
    expect(mayBreakOwnerContinuity(owner, { kind: "update", status: "TERMINATED" })).toBe(true);
    expect(mayBreakOwnerContinuity(owner, { kind: "update", status: "PROBATION" })).toBe(false);
    expect(mayBreakOwnerContinuity(owner, { kind: "update" })).toBe(false);
    expect(mayBreakOwnerContinuity(colleague, { kind: "delete" })).toBe(false);
  });

  it("offers a reissued invitation only to an employee who has not activated", () => {
    const colleague = { self: false, holdsOwnerRole: false, isLastUsableOwner: false };
    expect(targetFacts(colleague, "ONBOARDING", "invitation")).toEqual({
      target: { self: false, lifecycleAllowed: true },
    });
    expect(targetFacts(colleague, "ACTIVE", "invitation")).toEqual({
      target: { self: false, lifecycleAllowed: false },
    });
  });
});
