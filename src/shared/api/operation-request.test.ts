// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudienceClient } from "./audience-client";
import { operation as companyMe } from "./generated/company/get-api-v1-company-me";
import { operation as logout } from "./generated/company/post-api-v1-company-auth-logout";
import { operation as platformLogout } from "./generated/platform/post-api-v1-platform-auth-logout";
import { ContractViolation } from "./generated/runtime";
import { executeOperationRequest } from "./operation-request";

afterEach(() => vi.unstubAllGlobals());

function companyClient() {
  return createAudienceClient({
    audience: "company",
    getAccessToken: () => "company-token",
    getRefreshToken: () => "company-refresh",
    getSessionGeneration: () => "company-generation",
    refresh: vi.fn(),
    updateTokens: vi.fn(),
    clearSession: vi.fn(),
  });
}

describe("explicit generated operation request", () => {
  it("does not refresh or clear credentials for a malformed unauthorized response", async () => {
    const refresh = vi.fn();
    const clearSession = vi.fn();
    const client = createAudienceClient({
      audience: "company",
      getAccessToken: () => "company-token",
      getRefreshToken: () => "company-refresh",
      getSessionGeneration: () => "generation",
      refresh,
      updateTokens: vi.fn(),
      clearSession,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"detail":"internal-canary"}', { status: 401 })),
    );
    await expect(executeOperationRequest(client, companyMe, {})).rejects.toBeInstanceOf(
      ContractViolation,
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it("clears the matching generation after a validated mutation refusal without replaying it", async () => {
    const refresh = vi.fn();
    const clearSession = vi.fn();
    const client = createAudienceClient({
      audience: "company",
      getAccessToken: () => "company-token",
      getRefreshToken: () => "company-refresh",
      getSessionGeneration: () => "generation",
      refresh,
      updateTokens: vi.fn(),
      clearSession,
    });
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            type: "about:blank",
            title: "Unauthorized",
            status: 401,
            detail: "internal-canary",
            instance: "/request",
            traceId: "a".repeat(32),
          }),
          { status: 401 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(executeOperationRequest(client, logout, {})).rejects.toThrow(
      "The request could not be completed.",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalledOnce();
  });
  it("sends the canonical method and audience token and accepts a bodyless response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        expect(new URL(request.url).pathname).toBe("/api/v1/company/auth/logout");
        expect(request.method).toBe("POST");
        expect(request.headers.get("Authorization")).toBe("Bearer company-token");
        return new Response(null, { status: 204 });
      }),
    );
    await expect(executeOperationRequest(companyClient(), logout, {})).resolves.toBeUndefined();
  });

  it("rejects a foreign operation before sending credentials", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      executeOperationRequest(companyClient(), platformLogout, {}),
    ).rejects.toBeInstanceOf(ContractViolation);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
