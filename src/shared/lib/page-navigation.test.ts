import { describe, expect, it } from "vitest";
import { pageDestination } from "./page-destination";

describe("page navigation boundary", () => {
  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "https://evil.example",
  ])("rejects off-origin destination %s", (to) => {
    expect(() => pageDestination({ to })).toThrow("Invalid page destination");
  });
  it("encodes identifiers and preserves only explicit URL search", () => {
    expect(
      pageDestination({
        to: "/platform/leads/$publicId",
        params: { publicId: "a/b" },
        search: { page: 2, cursor: undefined },
      }),
    ).toBe("/platform/leads/a%2Fb?page=2");
  });
});
