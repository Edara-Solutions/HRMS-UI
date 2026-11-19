import { QueryClient } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAudienceSessionStore } from "./audience-session";

interface User {
  mustChangePassword: boolean;
}

const tokens = {
  accessToken: "access",
  refreshToken: "refresh",
  sessionId: "session",
  expiresIn: 900,
  mustChangePassword: false,
};

describe("audience session store", () => {
  it("does not erase a newer tab replacement before its storage event arrives", () => {
    const schema = z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      sessionId: z.string(),
      expiresIn: z.number(),
      mustChangePassword: z.boolean(),
      user: z.object({ mustChangePassword: z.boolean() }),
    });
    const company = createAudienceSessionStore("company", "late-logout-company", schema);
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    localStorage.setItem(
      "late-logout-company",
      JSON.stringify({
        version: 1,
        state: {
          audience: "company",
          generation: "newer-replacement",
          eventKind: "replacement",
          session: { ...tokens, accessToken: "new-access", user: { mustChangePassword: false } },
        },
      }),
    );
    company.getState().clearSession();
    expect(company.getState().session?.accessToken).toBe("new-access");
    expect(company.getState().status).toBe("hydrating");
    expect(localStorage.getItem("late-logout-company")).toContain("newer-replacement");
    company.getState().stopStorageSync();
  });
  it("keeps an initial token password gate until matching identity revalidation clears it", async () => {
    const company = createAudienceSessionStore<User>("company", "initial-token-gate");
    company.getState().setSession({
      ...tokens,
      mustChangePassword: true,
      user: { mustChangePassword: false },
    });
    expect(company.getState().status).toBe("must_change_password");
    await company.getState().revalidate(async () => ({ mustChangePassword: false }));
    expect(company.getState().status).toBe("authenticated");
    company.getState().stopStorageSync();
  });
  it("locks only the rotating audience and never unlocks the gate from tokens alone", async () => {
    const company = createAudienceSessionStore<User>("company", "forced-rotation-company");
    const platform = createAudienceSessionStore<User>("platform", "forced-rotation-platform");
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    platform.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    company.getState().updateTokens({ ...tokens, mustChangePassword: true });
    expect(company.getState().status).toBe("must_change_password");
    expect(platform.getState().status).toBe("authenticated");
    company.getState().updateTokens({ ...tokens, mustChangePassword: false });
    expect(company.getState().status).toBe("must_change_password");
    await company.getState().revalidate(async () => ({ mustChangePassword: false }));
    expect(company.getState().status).toBe("authenticated");
    company.getState().stopStorageSync();
    platform.getState().stopStorageSync();
  });
  it("cancels and removes old identity work before exposing a replacement identity", async () => {
    const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const company = createAudienceSessionStore<User>("company", "cache-company", undefined, () =>
      queries.clear(),
    );
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    queries.setQueryData(["company", "old-user", "profile"], "old-profile-canary");
    let requestSignal: AbortSignal | undefined;
    const read = queries.fetchQuery({
      queryKey: ["company", "old-user", "pending"],
      queryFn: ({ signal }) => {
        requestSignal = signal;
        return new Promise<string>(() => {});
      },
    });
    const cancelled = expect(read).rejects.toThrow();
    company
      .getState()
      .setSession({ ...tokens, accessToken: "replacement", user: { mustChangePassword: false } });
    await cancelled;
    expect(requestSignal?.aborted).toBe(true);
    expect(queries.getQueryData(["company", "old-user", "profile"])).toBeUndefined();
    expect(company.getState().session?.accessToken).toBe("replacement");
    company.getState().stopStorageSync();
  });
  it("returns a failed transient authentication to anonymous without installing credentials", async () => {
    const company = createAudienceSessionStore<User>("company", "failed-login-company");
    await expect(
      company.getState().authenticate(async () => {
        throw new Error("Identity validation failed");
      }),
    ).rejects.toThrow();
    expect(company.getState().session).toBeNull();
    expect(company.getState().status).toBe("anonymous");
    company.getState().stopStorageSync();
  });
  it("quarantines persisted credentials until matching identity revalidation completes", async () => {
    const schema = z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      sessionId: z.string(),
      expiresIn: z.number(),
      mustChangePassword: z.boolean(),
      user: z.object({ mustChangePassword: z.boolean() }),
    });
    localStorage.setItem(
      "cold-company",
      JSON.stringify({
        version: 1,
        state: {
          audience: "company",
          generation: "cold-generation",
          eventKind: "replacement",
          session: { ...tokens, user: { mustChangePassword: false } },
        },
      }),
    );
    const company = createAudienceSessionStore("company", "cold-company", schema);
    expect(company.getState().status).toBe("hydrating");
    await company.getState().revalidate(async () => ({ mustChangePassword: true }));
    expect(company.getState().status).toBe("must_change_password");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("keeps persistence keys and forced-password state audience-local", () => {
    const company = createAudienceSessionStore<User>("company", "hrms-company-session:v1");
    const platform = createAudienceSessionStore<User>("platform", "hrms-platform-session:v1");

    act(() => company.getState().setSession({ ...tokens, user: { mustChangePassword: true } }));

    expect(company.getState().status).toBe("must_change_password");
    expect(platform.getState().session).toBeNull();
    expect(localStorage.getItem("hrms-company-session:v1")).toContain('"audience":"company"');
    expect(localStorage.getItem("hrms-platform-session:v1")).toBeNull();
  });

  it("ignores stale authentication attempts", () => {
    const company = createAudienceSessionStore<User>("company", "hrms-company-session:v1");
    const first = company.getState().setAuthenticating();
    const second = company.getState().setAuthenticating();

    expect(company.getState().isCurrentAttempt(first)).toBe(false);
    expect(company.getState().isCurrentAttempt(second)).toBe(true);
  });

  it("invalidates an in-flight login when the audience signs out", () => {
    const company = createAudienceSessionStore<User>("company", "hrms-company-session:v1");
    const attempt = company.getState().setAuthenticating();
    company.getState().clearSession();
    expect(company.getState().isCurrentAttempt(attempt)).toBe(false);
  });

  it("does not restore credentials when revalidation finishes after logout", async () => {
    const company = createAudienceSessionStore<User>("company", "late-company");
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    let resolveUser: (user: User) => void = () => {};
    const user = new Promise<User>((resolve) => {
      resolveUser = resolve;
    });
    const validation = company.getState().revalidate(() => user);
    company.getState().clearSession();
    resolveUser({ mustChangePassword: true });
    await validation;
    expect(company.getState().session).toBeNull();
    expect(company.getState().status).toBe("anonymous");
  });

  it("keeps offline credentials quarantined and allows explicit revalidation retry", async () => {
    const company = createAudienceSessionStore<User>("company", "offline-company");
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    await expect(
      company.getState().revalidate(async () => {
        throw new TypeError("Offline");
      }),
    ).rejects.toThrow();
    expect(company.getState().status).toBe("unavailable");
    expect(company.getState().session?.accessToken).toBe("access");
    await company.getState().revalidate(async () => ({ mustChangePassword: false }));
    expect(company.getState().status).toBe("authenticated");
  });

  it("does not allow a login attempt to replace an established audience slot", () => {
    const company = createAudienceSessionStore<User>("company", "occupied-company");
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    expect(() => company.getState().setAuthenticating()).toThrow("Audience session already exists");
    expect(company.getState().status).toBe("authenticated");
  });

  it("converges on another tab's logout and invalidates deferred identity validation", async () => {
    const schema = z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      sessionId: z.string(),
      expiresIn: z.number(),
      mustChangePassword: z.boolean(),
      user: z.object({ mustChangePassword: z.boolean() }),
    });
    const company = createAudienceSessionStore("company", "tab-company", schema);
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    let resolveUser: (user: User) => void = () => {};
    const user = new Promise<User>((resolve) => {
      resolveUser = resolve;
    });
    const validation = company.getState().revalidate(() => user);
    const envelope = JSON.stringify({
      version: 1,
      state: {
        audience: "company",
        generation: "logout-generation",
        eventKind: "logout",
        session: null,
      },
    });
    localStorage.setItem("tab-company", envelope);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "tab-company",
        newValue: envelope,
        storageArea: localStorage,
      }),
    );
    resolveUser({ mustChangePassword: true });
    await validation;
    expect(company.getState().session).toBeNull();
    expect(company.getState().status).toBe("anonymous");
    expect(company.getState().generation).toBe("logout-generation");
    company.getState().stopStorageSync();
  });

  it("discards an unknown storage version without clearing the other audience", () => {
    const schema = z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      sessionId: z.string(),
      expiresIn: z.number(),
      mustChangePassword: z.boolean(),
      user: z.object({ mustChangePassword: z.boolean() }),
    });
    const company = createAudienceSessionStore("company", "invalid-company", schema);
    const platform = createAudienceSessionStore<User>("platform", "valid-platform");
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    platform.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    const envelope = JSON.stringify({
      version: 99,
      state: { audience: "company", session: company.getState().session },
    });
    localStorage.setItem("invalid-company", envelope);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "invalid-company",
        newValue: envelope,
        storageArea: localStorage,
      }),
    );
    expect(company.getState().session).toBeNull();
    expect(platform.getState().session?.accessToken).toBe("access");
    company.getState().stopStorageSync();
    platform.getState().stopStorageSync();
  });

  it("does not overwrite a newer tab generation before its storage event is delivered", () => {
    const company = createAudienceSessionStore<User>("company", "deferred-event-company");
    company.getState().setSession({ ...tokens, user: { mustChangePassword: false } });
    localStorage.setItem(
      "deferred-event-company",
      JSON.stringify({
        version: 1,
        state: {
          audience: "company",
          generation: "newer-tab",
          eventKind: "logout",
          session: null,
        },
      }),
    );
    company.getState().updateTokens({ ...tokens, accessToken: "stale-rotation" });
    expect(company.getState().session).toBeNull();
    expect(localStorage.getItem("deferred-event-company")).not.toContain("stale-rotation");
    company.getState().stopStorageSync();
  });
});
