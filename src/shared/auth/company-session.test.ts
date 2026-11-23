import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { companySessionFixture } from "../../test/audience-fixtures";
import { operationNetwork } from "../../test/operation-request-mock";
import { enterSupportAccess } from "../company-auth";
import { endSupportAccess, useCompanySession } from "./company-session";

const storageKey = "hrms-company-session:v1";
const accessSessionPublicId = "3f0f7a52-5d5b-4b8e-9d7e-7c3e8b1f2a10";
const assign = vi.fn();

function delegateSession(sessionId = accessSessionPublicId) {
  return companySessionFixture({
    delegation: {
      accessSessionPublicId: sessionId,
      companyName: "Acme Company",
      reason: "SUPPORT_REQUEST",
      scope: "READ",
      expiresAt: "2030-01-01T00:00:00.000Z",
    },
  });
}

function writeFromAnotherTab(session: ReturnType<typeof companySessionFixture> | null) {
  const newValue = JSON.stringify({
    version: 1,
    state: {
      audience: "company",
      generation: crypto.randomUUID(),
      eventKind: session ? "replacement" : "logout",
      session,
    },
  });
  localStorage.setItem(storageKey, newValue);
  window.dispatchEvent(
    new StorageEvent("storage", { key: storageKey, newValue, storageArea: localStorage }),
  );
}

function openAt(pathname: string) {
  vi.stubGlobal("location", { ...window.location, pathname, assign });
}

beforeEach(() => {
  assign.mockClear();
  useCompanySession.getState().clearSession();
  openAt("/company/profile");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useCompanySession.getState().clearSession();
  localStorage.clear();
});

describe("Company session ended from another tab", () => {
  it("returns an open support portal tab to its access session", () => {
    useCompanySession.getState().setSession(delegateSession());

    writeFromAnotherTab(null);

    expect(useCompanySession.getState().session).toBeNull();
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(`/platform/access-sessions/${accessSessionPublicId}`);
  });

  it("keeps the sign-in prompt for an ordinary Company member", () => {
    useCompanySession.getState().setSession(companySessionFixture());

    writeFromAnotherTab(null);

    expect(useCompanySession.getState().session).toBeNull();
    expect(useCompanySession.getState().status).toBe("anonymous");
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not let an ended delegation redirect a later ordinary sign-in", () => {
    useCompanySession.getState().setSession(delegateSession());
    writeFromAnotherTab(null);
    assign.mockClear();

    writeFromAnotherTab(companySessionFixture());
    writeFromAnotherTab(null);

    expect(assign).not.toHaveBeenCalled();
  });

  it("does not route on a malformed access session id", () => {
    useCompanySession.getState().setSession(delegateSession("//evil.example"));

    writeFromAnotherTab(null);

    expect(useCompanySession.getState().session).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("leaves a Platform tab where it is", () => {
    openAt(`/platform/access-sessions/${accessSessionPublicId}`);
    useCompanySession.getState().setSession(delegateSession());

    writeFromAnotherTab(null);

    expect(assign).not.toHaveBeenCalled();
  });

  it("leaves a Company sign-in page where it is", () => {
    openAt("/company/login");
    useCompanySession.getState().setSession(delegateSession());

    writeFromAnotherTab(null);

    expect(assign).not.toHaveBeenCalled();
  });

  it("never publishes an empty session while re-entering support access", async () => {
    const next = delegateSession();
    operationNetwork.install().on("GET /api/v1/company/me", () => ({
      status: 200,
      body: next.user,
    }));
    useCompanySession.getState().setSession(delegateSession());
    const writes = vi.spyOn(Storage.prototype, "setItem");

    await enterSupportAccess({
      accessToken: "next-token",
      expiresIn: 3600,
      sessionPublicId: accessSessionPublicId,
      companyPublicId: next.user.companyPublicId,
    });

    const published = writes.mock.calls
      .filter(([key]) => key === storageKey)
      .map(([, value]) => JSON.parse(value).state.session);
    expect(published.length).toBeGreaterThan(0);
    expect(published).not.toContain(null);
    expect(useCompanySession.getState().session?.accessToken).toBe("next-token");
  });

  it("does not route a same-tab exit on a malformed access session id", () => {
    useCompanySession.getState().setSession(delegateSession("//evil.example"));

    endSupportAccess();

    expect(useCompanySession.getState().session).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });
});
