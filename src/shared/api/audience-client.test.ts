// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudienceClient } from "./audience-client";

afterEach(() => vi.unstubAllGlobals());

function clientFixture() {
  const refresh = vi.fn(async () => ({
    accessToken: "rotated",
    refreshToken: "rotated-refresh",
    sessionId: "session",
    expiresIn: 900,
    mustChangePassword: false,
  }));
  const clearSession = vi.fn();
  const updateTokens = vi.fn();
  const client = createAudienceClient({
    audience: "company",
    getAccessToken: () => "company-token",
    getRefreshToken: () => "refresh",
    getSessionGeneration: () => "generation",
    refresh,
    clearSession,
    updateTokens,
  });
  return { client, refresh, clearSession, updateTokens };
}

describe("audience-bound transport", () => {
  it("does not replay protected work after rotation reports a forced password change", async () => {
    let accessToken = "old-access";
    let refreshToken = "old-refresh";
    const fetchMock = vi.fn(async () => new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createAudienceClient({
      audience: "company",
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      getSessionGeneration: () => "generation",
      refresh: async () => ({
        accessToken: "rotated",
        refreshToken: "rotated-refresh",
        sessionId: "session",
        expiresIn: 900,
        mustChangePassword: true,
      }),
      updateTokens: (tokens) => {
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      },
      clearSession: vi.fn(),
    });
    await expect(client.get("api/v1/company/me/profile")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("clears only the bound session when a replay remains unauthorized", async () => {
    let accessToken = "company-token";
    let refreshToken = "refresh";
    const clearSession = vi.fn();
    const fetchMock = vi.fn(async () => new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createAudienceClient({
      audience: "company",
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      getSessionGeneration: () => "generation",
      refresh: async () => ({
        accessToken: "rotated",
        refreshToken: "rotated-refresh",
        sessionId: "session",
        expiresIn: 900,
        mustChangePassword: false,
      }),
      updateTokens: (tokens) => {
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      },
      clearSession,
    });
    await expect(client.get("api/v1/company/me")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(clearSession).toHaveBeenCalledOnce();
  });
  it("shares one rotation and replays both concurrent reads once", async () => {
    let accessToken = "company-token";
    let refreshToken = "refresh";
    const refresh = vi.fn(async () => ({
      accessToken: "rotated",
      refreshToken: "rotated-refresh",
      sessionId: "session",
      expiresIn: 900,
      mustChangePassword: false,
    }));
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const bearer = request.headers.get("Authorization") ?? "";
        requests.push(bearer);
        return new Response(bearer === "Bearer rotated" ? "{}" : null, {
          status: bearer === "Bearer rotated" ? 200 : 401,
        });
      }),
    );
    const client = createAudienceClient({
      audience: "company",
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      getSessionGeneration: () => "company-generation",
      refresh,
      clearSession: vi.fn(),
      updateTokens: (tokens) => {
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      },
    });
    const results = await Promise.allSettled([
      client.get("api/v1/company/me"),
      client.get("api/v1/company/me/profile"),
    ]);
    expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(requests).toEqual([
      "Bearer company-token",
      "Bearer company-token",
      "Bearer rotated",
      "Bearer rotated",
    ]);
  });
  it("does not refresh an established session for transient credential validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    const { client, refresh } = clientFixture();
    await expect(
      client.get("api/v1/company/me", { headers: { Authorization: "Bearer transient" } }),
    ).rejects.toThrow();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not refresh a replacement session after an old request returns unauthorized", async () => {
    let accessToken = "old-access";
    let resolveResponse: (response: Response) => void = () => {};
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response),
    );
    const refresh = vi.fn();
    const client = createAudienceClient({
      audience: "company",
      getAccessToken: () => accessToken,
      getRefreshToken: () => "new-refresh",
      getSessionGeneration: () => "generation",
      refresh,
      updateTokens: vi.fn(),
      clearSession: vi.fn(),
    });
    const request = client.get("api/v1/company/me");
    const result = expect(request).rejects.toThrow();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    accessToken = "replacement-access";
    resolveResponse(new Response(null, { status: 401 }));
    await result;
    expect(refresh).not.toHaveBeenCalled();
  });
  it("rejects a foreign audience before sending any token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { client } = clientFixture();
    await expect(client.get("api/v1/platform/me")).rejects.toThrow("Request audience mismatch");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not replay a mutation on unauthorized response", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const { client, refresh } = clientFixture();
    await expect(client.post("api/v1/company/me/password", { json: {} })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("keeps auth requests free of established bearer tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        expect(request.headers.has("Authorization")).toBe(false);
        return new Response("{}", { status: 200 });
      }),
    );
    await clientFixture().client.post("api/v1/company/auth/login", { json: {} });
  });
});
