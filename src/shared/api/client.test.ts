// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession, LoginTokens, SessionUser } from "@/shared/auth";
import { useAuthStore } from "@/shared/auth";
import { apiClient } from "./client";

const baseUser: SessionUser = {
  publicId: "user-1",
  employeeCode: "EMP-001",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  status: "ACTIVE",
  companyCode: "ACME",
  mustChangePassword: false,
  permissions: [],
  isOwner: false,
  isPlatformAdmin: false,
};

function buildSession(tokens: Partial<LoginTokens> = {}): AuthSession {
  return {
    accessToken: "old-access-token",
    refreshToken: "old-refresh-token",
    sessionId: "session-1",
    expiresIn: 900,
    ...tokens,
    user: baseUser,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authHeader(input: RequestInfo | URL, init?: RequestInit) {
  const request = input instanceof Request ? input : new Request(input, init);
  return request.headers.get("Authorization");
}

function urlOf(input: RequestInfo | URL) {
  return input instanceof Request ? input.url : input.toString();
}

describe("apiClient refresh-on-401", () => {
  beforeEach(() => {
    useAuthStore.setState({ session: buildSession(), status: "authenticated" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useAuthStore.setState({ session: null, status: "anonymous" });
  });

  it("refreshes the token once and retries the original request", async () => {
    const rotatedTokens: LoginTokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      sessionId: "session-1",
      expiresIn: 900,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = urlOf(input);

      if (url.includes("auth/refresh")) {
        return jsonResponse(rotatedTokens);
      }

      if (url.includes("protected")) {
        if (authHeader(input, init) === "Bearer new-access-token") {
          return jsonResponse({ ok: true });
        }

        return jsonResponse({ message: "unauthorized" }, 401);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await apiClient.get("protected").json();

    expect(result).toEqual({ ok: true });

    const refreshCalls = fetchMock.mock.calls.filter(([input]) =>
      urlOf(input).includes("auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);

    const protectedCalls = fetchMock.mock.calls.filter(([input]) =>
      urlOf(input).includes("protected"),
    );
    expect(protectedCalls).toHaveLength(2);
    expect(authHeader(protectedCalls[0][0], protectedCalls[0][1])).toBe("Bearer old-access-token");
    expect(authHeader(protectedCalls[1][0], protectedCalls[1][1])).toBe("Bearer new-access-token");

    expect(useAuthStore.getState().session?.accessToken).toBe("new-access-token");
    expect(useAuthStore.getState().session?.refreshToken).toBe("new-refresh-token");
  });

  it("clears the session and redirects to /login when refresh fails", async () => {
    const assignSpy = vi.fn();
    vi.stubGlobal("window", { location: { assign: assignSpy } });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = urlOf(input);

      if (url.includes("auth/refresh")) {
        return jsonResponse({ message: "invalid refresh token" }, 401);
      }

      if (url.includes("protected")) {
        return jsonResponse({ message: "unauthorized" }, 401);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("protected")).rejects.toThrow();

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().status).toBe("anonymous");
    expect(assignSpy).toHaveBeenCalledWith("/login");
  });

  it("shares a single refresh across concurrent 401s (single-flight)", async () => {
    const rotatedTokens: LoginTokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      sessionId: "session-1",
      expiresIn: 900,
    };

    let refreshCount = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = urlOf(input);

      if (url.includes("auth/refresh")) {
        refreshCount += 1;
        return jsonResponse(rotatedTokens);
      }

      if (url.includes("protected")) {
        if (authHeader(input, init) === "Bearer new-access-token") {
          return jsonResponse({ ok: true });
        }

        return jsonResponse({ message: "unauthorized" }, 401);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      apiClient.get("protected/one").json(),
      apiClient.get("protected/two").json(),
    ]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(refreshCount).toBe(1);
  });

  it("does not loop when the retried request still 401s", async () => {
    const rotatedTokens: LoginTokens = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      sessionId: "session-1",
      expiresIn: 900,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = urlOf(input);

      if (url.includes("auth/refresh")) {
        return jsonResponse(rotatedTokens);
      }

      if (url.includes("protected")) {
        return jsonResponse({ message: "unauthorized" }, 401);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("protected")).rejects.toThrow();

    const refreshCalls = fetchMock.mock.calls.filter(([input]) =>
      urlOf(input).includes("auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);

    const protectedCalls = fetchMock.mock.calls.filter(([input]) =>
      urlOf(input).includes("protected"),
    );
    expect(protectedCalls).toHaveLength(2);
  });
  it("does not send a JSON content type for bodyless delete requests", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ message: "deleted" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiClient.delete("plans/plan-1").json();

    const [input, init] = fetchMock.mock.calls[0];
    const request = input instanceof Request ? input : new Request(input, init);

    expect(request.method).toBe("DELETE");
    expect(request.headers.has("Content-Type")).toBe(false);
  });
});
