import { describe, expect, it } from "vitest";
import { auditEventCatalog, auditEventMetadata } from "../src/shared/audit-catalog";
import { collectAuditCatalogMetadata } from "./audit-catalog-metadata.mjs";

describe("Audit Event catalog metadata", () => {
  it("reads one entry per catalog event out of the contract's annotations", () => {
    const collected = collectAuditCatalogMetadata();

    expect(collected).toHaveLength(80);
    expect(collected.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        "platform.role.created",
        "platform.access_session.opened",
        "platform.company_email_diagnostic.accepted",
      ]),
    );
    expect(
      collected.find((event) => event.eventType === "platform.role.created")?.actors,
    ).toContain("PLATFORM_USER");
    for (const event of collected) {
      expect(event.description.length).toBeGreaterThan(0);
      expect(["ACTIVE", "DEPRECATED"]).toContain(event.lifecycle);
      expect(["SUCCESS_ONLY", "ALLOW_FAILURE"]).toContain(event.outcomePolicy);
      expect(["none", "erase"]).toContain(event.personalData);
    }
  });

  // The table is the reader's only source for what an event means, so a hand-edited entry is a
  // lie rather than a stale copy of the truth: this is what makes editing it a failing build.
  it("catches a hand-edit, because the committed table is what the contract says", () => {
    expect(auditEventCatalog).toEqual(collectAuditCatalogMetadata());
  });

  it("answers with nothing for an event type this build has never heard of", () => {
    expect(auditEventMetadata("company.profile.completed")?.scope).toBe("COMPANY");
    expect(auditEventMetadata("not.an.event")).toBeUndefined();
  });

  it("keeps diagnostics Company scoped, Platform visible and free of personal data", () => {
    expect(auditEventMetadata("platform.company_email_diagnostic.accepted")).toMatchObject({
      scope: "COMPANY",
      audience: "PLATFORM",
      personalData: "none",
      actors: ["PLATFORM_USER"],
    });
  });
});
