import { describe, expect, it } from "vitest";
import { operation as login } from "./generated/company/post-api-v1-company-auth-login";
import { operation as logout } from "./generated/company/post-api-v1-company-auth-logout";
import { ContractViolation } from "./generated/runtime";
import { readOperationResponse } from "./operation-response";

describe("generated operation response boundary", () => {
  it("accepts an empty declared logout response", async () => {
    await expect(
      readOperationResponse(logout, new Response(null, { status: 204 })),
    ).resolves.toBeUndefined();
  });

  it("bounds malformed JSON diagnostics without retaining the secret response", async () => {
    const result = readOperationResponse(
      login,
      new Response("secret-canary-invalid-json", { status: 200 }),
    );
    await expect(result).rejects.toBeInstanceOf(ContractViolation);
    await expect(result).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining("secret-canary"),
    );
  });
});
