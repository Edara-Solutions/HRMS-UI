// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { useCompanySession as useAuthStore, usePlatformSession } from "@/shared/auth";
import { companySessionFixture, platformSessionFixture } from "../../test/audience-fixtures";
import { operation, responseSchemas } from "./generated/public/get-api-v1-public-plans";
import { executePublicRequest } from "./public-api";

afterEach(() => {
  vi.unstubAllGlobals();
  useAuthStore.setState({ session: null, status: "anonymous" });
  usePlatformSession.setState({ session: null, status: "anonymous" });
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
    const session = companySessionFixture();
    const platform = platformSessionFixture();
    usePlatformSession.setState({ session: platform, status: "authenticated" });
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
    expect(usePlatformSession.getState().session).toBe(platform);
  });
});
