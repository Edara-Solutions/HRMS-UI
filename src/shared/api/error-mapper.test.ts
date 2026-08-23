// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readBackendErrorMessage } from "./error-mapper";

describe("readBackendErrorMessage", () => {
  it("reads detail from the locked problem response", async () => {
    const response = Response.json({ detail: "Invitation has expired" });

    expect(await readBackendErrorMessage(response)).toBe("Invitation has expired");
  });

  it("ignores the retired legacy error field", async () => {
    const response = Response.json({ error: "Invalid credentials" }, { status: 429 });

    expect(await readBackendErrorMessage(response)).toBeNull();
  });

  it("ignores malformed problem responses", async () => {
    const response = Response.json({ detail: 422 });

    expect(await readBackendErrorMessage(response)).toBeNull();
  });
});
