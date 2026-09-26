import { afterEach, describe, expect, it } from "vitest";
import { useCompanySession, usePlatformSession } from "@/shared/auth";
import { companySessionFixture, platformSessionFixture } from "../../../../test/audience-fixtures";
import { parseAdminEmailSearch, requireEmailPlatformRouteAccess } from "./index";

afterEach(() => {
  useCompanySession.getState().clearSession();
  usePlatformSession.getState().clearSession();
});

describe("Platform email audience guard", () => {
  it("requires Platform authentication", async () => {
    await expect(requireEmailPlatformRouteAccess()).rejects.toMatchObject({
      options: { to: "/platform/login" },
    });
  });
  it("never accepts a Company Owner as Platform authentication", async () => {
    useCompanySession.getState().setSession(companySessionFixture({ isOwner: true }));
    await expect(requireEmailPlatformRouteAccess()).rejects.toMatchObject({
      options: { to: "/platform/login" },
    });
  });
  it("admits its established Platform identity", async () => {
    const session = platformSessionFixture();
    usePlatformSession.getState().setSession(session);
    await expect(requireEmailPlatformRouteAccess()).resolves.toEqual(session);
  });
  it("sanitizes invalid shareable search state", () => {
    expect(
      parseAdminEmailSearch({
        context: "UNKNOWN",
        emailTypeKey: "  owner-invitation  ",
        locale: "fr",
        view: "source",
      }),
    ).toEqual({ context: "ALL", emailTypeKey: "owner-invitation", locale: "en", view: "html" });
  });
});
