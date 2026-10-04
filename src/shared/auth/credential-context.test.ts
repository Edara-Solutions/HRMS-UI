import { afterEach, describe, expect, it } from "vitest";
import {
  clearCredentialContext,
  readCredentialContext,
  retainCredentialContext,
} from "./credential-context";

afterEach(() => {
  clearCredentialContext("company");
  clearCredentialContext("platform");
});

describe("safe credential context", () => {
  it("keeps only operation context in memory within the same audience and generation", () => {
    retainCredentialContext("company", "company-generation", {
      newEmail: "new@example.test",
      passwordAttempted: true,
    });
    expect(readCredentialContext("company", "company-generation")).toEqual({
      newEmail: "new@example.test",
      passwordAttempted: true,
    });
    expect(readCredentialContext("company", "new-generation")).toBeUndefined();
    expect(readCredentialContext("platform", "company-generation")).toBeUndefined();
    expect(localStorage.getItem("credential-context")).toBeNull();
  });

  it("clears only the departing audience", () => {
    retainCredentialContext("company", "company-generation", { passwordAttempted: true });
    retainCredentialContext("platform", "platform-generation", {
      newEmail: "platform@example.test",
    });
    clearCredentialContext("company");
    expect(readCredentialContext("company", "company-generation")).toBeUndefined();
    expect(readCredentialContext("platform", "platform-generation")?.newEmail).toBe(
      "platform@example.test",
    );
  });
});
