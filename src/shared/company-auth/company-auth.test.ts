// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { companySessionFixture, platformSessionFixture } from "../../test/audience-fixtures";

const storage = new Map<string, string>();
let company: typeof import("./index");
let platform: typeof import("../platform-auth");
let companyStore: typeof import("../auth/company-session").useCompanySession;
let platformStore: typeof import("../auth/platform-session").usePlatformSession;

beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  company = await import("./index");
  platform = await import("../platform-auth");
  companyStore = (await import("../auth/company-session")).useCompanySession;
  platformStore = (await import("../auth/platform-session")).usePlatformSession;
});
beforeEach(() => {
  companyStore.getState().clearSession();
  platformStore.getState().clearSession();
});
afterEach(() => vi.restoreAllMocks());

function wireIdentity(
  session: ReturnType<typeof companySessionFixture> | ReturnType<typeof platformSessionFixture>,
) {
  return session.user;
}
function wireTokens(
  session: ReturnType<typeof companySessionFixture> | ReturnType<typeof platformSessionFixture>,
) {
  const { user: _user, ...result } = session;
  return result;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
const unauthorized = {
  type: "about:blank",
  title: "Unauthorized",
  status: 401,
  detail: "internal-canary",
  instance: "/request",
  traceId: "a".repeat(32),
};

describe("generated audience credential journeys", () => {
  it("refreshes, validates matching /me, then replays a protected read once", async () => {
    const session = companySessionFixture();
    const other = platformSessionFixture();
    companyStore.getState().setSession(session);
    platformStore.getState().setSession(other);
    const paths: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const path = new URL(request.url).pathname;
        paths.push(path);
        if (path.endsWith("/auth/refresh"))
          return json({
            ...wireTokens(session),
            accessToken: "rotated",
            refreshToken: "rotated-refresh",
          });
        if (path.endsWith("/me")) {
          expect(request.headers.get("Authorization")).toBe("Bearer rotated");
          return json(session.user);
        }
        if (path.endsWith("/me/profile")) {
          if (request.headers.get("Authorization") !== "Bearer rotated")
            return json(unauthorized, 401);
          return json({
            employeeCode: "EMP-1",
            phone: null,
            level: null,
            hireDate: null,
            locale: "en",
            timezone: "UTC",
            photoUrl: null,
          });
        }
        throw new Error("Unexpected request");
      }),
    );
    const self = await import("../company-self");
    await self.readCompanyProfile();
    expect(paths).toEqual([
      "/api/v1/company/me/profile",
      "/api/v1/company/auth/refresh",
      "/api/v1/company/me",
      "/api/v1/company/me/profile",
    ]);
    expect(platformStore.getState().session).toEqual(other);
    expect(companyStore.getState().status).toBe("authenticated");
  });

  it("does not deadlock when cold /me validation itself requires refresh", async () => {
    const session = companySessionFixture();
    companyStore.getState().setSession(session);
    const paths: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const path = new URL(request.url).pathname;
        paths.push(path);
        if (path.endsWith("/auth/refresh"))
          return json({
            ...wireTokens(session),
            accessToken: "rotated",
            refreshToken: "rotated-refresh",
          });
        if (path.endsWith("/me"))
          return request.headers.get("Authorization") === "Bearer rotated"
            ? json(session.user)
            : json(unauthorized, 401);
        throw new Error("Unexpected request");
      }),
    );
    const { loadCompanyIdentity } = await import("../api/company-api");
    await companyStore.getState().revalidate(loadCompanyIdentity);
    expect(paths).toEqual([
      "/api/v1/company/me",
      "/api/v1/company/auth/refresh",
      "/api/v1/company/me",
      "/api/v1/company/me",
    ]);
    expect(companyStore.getState().status).toBe("authenticated");
  });

  it("quarantines a mismatched refreshed identity without replaying protected work", async () => {
    const session = companySessionFixture();
    const other = platformSessionFixture();
    companyStore.getState().setSession(session);
    platformStore.getState().setSession(other);
    const fetchMock = vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      if (path.endsWith("/auth/refresh"))
        return json({
          ...wireTokens(session),
          accessToken: "rotated",
          refreshToken: "rotated-refresh",
        });
      if (path.endsWith("/me"))
        return json({ ...session.user, companyPublicId: "9c76d6ab-55d0-481f-9e08-2910f8b42e90" });
      return json(unauthorized, 401);
    });
    vi.stubGlobal("fetch", fetchMock);
    const self = await import("../company-self");
    await expect(self.readCompanyProfile()).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(companyStore.getState().status).toBe("unavailable");
    expect(platformStore.getState().session).toEqual(other);
  });

  it("reconciles an uncertain email write before returning control without replaying it", async () => {
    const session = companySessionFixture();
    const other = platformSessionFixture();
    companyStore.getState().setSession(session);
    platformStore.getState().setSession(other);
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        calls.push(request.method);
        if (request.method === "POST") throw new TypeError("offline canary");
        return json({ ...session.user, email: "changed@example.test" });
      }),
    );
    const self = await import("../company-self");
    await expect(
      self.changeCompanyEmail({ currentPassword: "password", newEmail: "changed@example.test" }),
    ).rejects.toThrow();
    expect(calls).toEqual(["POST", "GET"]);
    expect(companyStore.getState().session?.user.email).toBe("changed@example.test");
    expect(platformStore.getState().session).toEqual(other);
  });

  it("keeps login transient until a matching validated identity is available", async () => {
    const session = companySessionFixture();
    const fetchMock = vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      if (path.endsWith("/auth/login")) {
        expect(request.headers.get("Authorization")).toBeNull();
        expect(await request.json()).toEqual({
          companyCode: "EDARA",
          employeeCode: "EMP-1",
          password: "secret",
          clientType: "web",
        });
        return json(wireTokens(session));
      }
      expect(companyStore.getState().session).toBeNull();
      expect(path).toBe("/api/v1/company/me");
      expect(request.headers.get("Authorization")).toBe("Bearer access-canary");
      return json(wireIdentity(session));
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      company.signInCompany({
        companyCode: "EDARA",
        employeeCode: "EMP-1",
        password: "secret",
        clientType: "web",
      }),
    ).resolves.toEqual(session);
    expect(companyStore.getState().session).toEqual(session);
    expect(platformStore.getState().session).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retain transient tokens when identity validation refuses access", async () => {
    const existingPlatform = platformSessionFixture();
    platformStore.getState().setSession(existingPlatform);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) =>
        new URL(request.url).pathname.endsWith("/auth/login")
          ? json(wireTokens(companySessionFixture()))
          : json(unauthorized, 401),
      ),
    );
    await expect(
      company.signInCompany({
        companyCode: "EDARA",
        employeeCode: "EMP-1",
        password: "secret",
        clientType: "web",
      }),
    ).rejects.toThrow();
    expect(companyStore.getState().session).toBeNull();
    expect(platformStore.getState().session).toEqual(existingPlatform);
  });

  it("keeps both established sessions while signing in to Platform", async () => {
    const existingCompany = companySessionFixture();
    const newPlatform = platformSessionFixture(
      {},
      { accessToken: "platform-access", refreshToken: "platform-refresh" },
    );
    companyStore.getState().setSession(existingCompany);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        expect(new URL(request.url).pathname.startsWith("/api/v1/platform/")).toBe(true);
        if (new URL(request.url).pathname.endsWith("/auth/login")) {
          expect(request.headers.get("Authorization")).toBeNull();
          return json(wireTokens(newPlatform));
        }
        expect(request.headers.get("Authorization")).toBe("Bearer platform-access");
        return json(wireIdentity(newPlatform));
      }),
    );
    await platform.signInPlatform({
      email: newPlatform.user.email,
      password: "secret",
      clientType: "web",
    });
    expect(companyStore.getState().session).toEqual(existingCompany);
    expect(platformStore.getState().session).toEqual(newPlatform);
  });

  it("clears Company locally before an offline logout completes and preserves Platform", async () => {
    companyStore.getState().setSession(companySessionFixture());
    const existingPlatform = platformSessionFixture();
    platformStore.getState().setSession(existingPlatform);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        expect(companyStore.getState().session).toBeNull();
        throw new TypeError("Offline");
      }),
    );
    await expect(company.signOutCompany()).resolves.toEqual({ remoteConfirmed: false });
    expect(platformStore.getState().session).toEqual(existingPlatform);
  });

  it("validates bodyless logout-all confirmation and never sends another audience token", async () => {
    companyStore.getState().setSession(companySessionFixture());
    platformStore
      .getState()
      .setSession(platformSessionFixture({}, { accessToken: "platform-canary" }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        expect(new URL(request.url).pathname).toBe("/api/v1/company/auth/logout-all");
        expect(request.headers.get("Authorization")).toBe("Bearer access-canary");
        return new Response(null, { status: 204 });
      }),
    );
    await expect(company.signOutCompany(true)).resolves.toEqual({ remoteConfirmed: true });
    expect(platformStore.getState().session?.accessToken).toBe("platform-canary");
  });

  it("accepts bodyless Company recovery without installing a session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        expect(request.headers.get("Authorization")).toBeNull();
        expect(new URL(request.url).pathname).toBe("/api/v1/company/auth/password-reset/confirm");
        expect(await request.json()).toEqual({
          companyPublicId: companySessionFixture().user.companyPublicId,
          token: "link-token",
          newPassword: "new-secret",
        });
        return new Response(null, { status: 204 });
      }),
    );
    await company.confirmCompanyRecovery({
      companyPublicId: companySessionFixture().user.companyPublicId,
      token: "link-token",
      newPassword: "new-secret",
    });
    expect(companyStore.getState().session).toBeNull();
  });
});
