import { describe, expect, it } from "vitest";
import { applyDocumentDirection, getDirection } from "./direction";

describe("getDirection", () => {
  it("maps English to LTR and Arabic to RTL", () => {
    expect(getDirection("en")).toBe("ltr");
    expect(getDirection("ar")).toBe("rtl");
  });

  it("applies lang and dir to the document element", () => {
    applyDocumentDirection("ar");

    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");

    applyDocumentDirection("en");
  });
});
