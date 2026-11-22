import { describe, expect, it } from "vitest";
import { companyPeopleOperations as operations } from "@/shared/api";
import { otherOwner, peopleIds, personBody } from "../../../../test/company-people-fixtures";
import {
  mayBreakOwnerContinuity,
  parseBulkRows,
  rosterSearchSchema,
  summarizeBulk,
} from "./roster";

describe("bulk Owner continuity", () => {
  const owner = operations.user.responses["200"].parse(personBody(peopleIds.owner, otherOwner));
  const colleague = operations.user.responses["200"].parse(personBody(peopleIds.colleague));

  it("flags only removals or non-working statuses of an Owner", () => {
    expect(mayBreakOwnerContinuity({ kind: "delete" }, owner)).toBe(true);
    expect(mayBreakOwnerContinuity({ kind: "status", status: "RESIGNED" }, owner)).toBe(true);
    expect(mayBreakOwnerContinuity({ kind: "status", status: "PROBATION" }, owner)).toBe(false);
    expect(mayBreakOwnerContinuity({ kind: "delete" }, colleague)).toBe(false);
  });
});

describe("bulk outcome summary", () => {
  it("separates successes, declared failures and unaccounted items without all-or-nothing", () => {
    expect(
      summarizeBulk(
        {
          success: [{}, {}],
          errors: [{ index: 3 }, { index: 3 }, { index: 9 }],
        },
        5,
      ),
    ).toEqual({ succeeded: 2, failedPositions: [4], unaccounted: 2 });
  });
});

describe("bulk add rows", () => {
  it("validates each line with the generated item schema and reports bad lines", () => {
    expect(
      parseBulkRows(
        "Sara, Ahmed, sara@edara.test\n\nOmar,,omar@edara.test\nA, B, not-an-email\nX, Y, x@e.test, extra",
      ),
    ).toEqual({
      rows: [{ firstName: "Sara", lastName: "Ahmed", email: "sara@edara.test" }],
      invalidLines: [3, 4, 5],
    });
  });
});

describe("roster search", () => {
  it("falls back instead of failing on unknown filters or bad pages", () => {
    expect(rosterSearchSchema.parse({ q: "  sara ", status: "HACKED", page: "-2" })).toEqual({
      q: "sara",
      status: undefined,
      page: undefined,
    });
  });
});
