import { describe, expect, it } from "vitest";
import { getDirection } from "./direction";

describe("getDirection", () => {
  it("maps English to LTR and Arabic to RTL", () => {
    expect(getDirection("en")).toBe("ltr");
    expect(getDirection("ar")).toBe("rtl");
  });
});
