import { describe, expect, it } from "vitest";
import { companyCommunicationsOperations as operations } from "@/shared/api";
import {
  emailSettingsBody,
  sendingDomainBody,
} from "../../../../test/company-communications-fixtures";
import { domainState, toEmailSettingsBody, toEmailSettingsForm } from "./email-settings";

const domain = (status: "PENDING" | "VERIFIED" | "FAILED", health?: string) =>
  operations.sendingDomain.responses["200"].parse(
    sendingDomainBody(status, health ? { health } : {}),
  );

describe("sending domain state", () => {
  it("keeps not configured, DNS pending, failed, stale, unhealthy and ready apart", () => {
    expect(domainState(null, undefined)).toBe("not-configured");
    expect(domainState(domain("PENDING"), { ready: false, reason: "NOT_VERIFIED" })).toBe(
      "dns-pending",
    );
    expect(domainState(domain("FAILED"), { ready: false, reason: "NOT_VERIFIED" })).toBe(
      "verification-failed",
    );
    expect(domainState(domain("VERIFIED"), { ready: false, reason: "STALE" })).toBe("stale");
    expect(domainState(domain("VERIFIED", "UNHEALTHY"), { ready: false })).toBe("unhealthy");
    expect(domainState(domain("VERIFIED"), { ready: true })).toBe("ready");
  });

  it("never reports a verified domain as pending when its readiness is unknown", () => {
    expect(domainState(domain("VERIFIED"), undefined)).toBe("verified");
  });
});

describe("email settings body", () => {
  it("sends only the writable fields and omits an empty logo", () => {
    const settings = operations.emailSettings.responses["200"].parse(emailSettingsBody());
    const body = toEmailSettingsBody(toEmailSettingsForm(settings));
    expect(body).not.toHaveProperty("logoUrl");
    expect(body).not.toHaveProperty("sendingDomain");
    expect(body).not.toHaveProperty("senderVerified");
    expect(operations.updateEmailSettings.requestSchema.safeParse({ body }).success).toBe(true);
  });
});
