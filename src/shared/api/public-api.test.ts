// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { type AuthSession, useAuthStore } from "@/shared/auth";
import { operation, responseSchemas } from "./generated/public/get-api-v1-public-plans";
import { executePublicRequest } from "./public-api";

afterEach(() => {
  vi.unstubAllGlobals();
  useAuthStore.setState({ session: null, status: "anonymous" });
});

describe("publicApi", () => {
  it("never sends credentials or an Authorization header", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      expect(request.credentials).toBe("omit");
      expect(request.headers.has("Authorization")).toBe(false);
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      executePublicRequest({
        operation,
        request: { query: {} },
        responseSchema: responseSchemas["200"],
      }),
    ).resolves.toEqual({ data: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not refresh, clear a session, or redirect after a 401", async () => {
    const session: AuthSession = {
      accessToken: "private-access-token",
      refreshToken: "private-refresh-token",
      sessionId: "session-1",
      expiresIn: 900,
      user: {
        publicId: "user-1",
        employeeCode: "EMP-1",
        firstName: "A",
        lastName: "B",
        email: "a@example.com",
        status: "ACTIVE",
        companyCode: "ACME",
        mustChangePassword: false,
        permissions: [],
        isOwner: false,
        isPlatformAdmin: false,
      },
    };
    useAuthStore.setState({ session, status: "authenticated" });
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ message: "unauthorized" }), { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      executePublicRequest({
        operation,
        request: { query: {} },
        responseSchema: responseSchemas["200"],
      }),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().session).toBe(session);
  });
});
