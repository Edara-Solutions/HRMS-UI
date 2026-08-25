import { describe, expect, it } from "vitest";
import { buildAuditEventTaxonomy } from "./audit-event-taxonomy";

describe("buildAuditEventTaxonomy", () => {
  it("groups event types into domains and families by splitting on the dot", () => {
    const taxonomy = buildAuditEventTaxonomy([
      "company.lifecycle.created",
      "auth.session.started",
      "company.lifecycle.frozen",
      "company.profile.material_updated",
    ]);

    expect(taxonomy).toEqual([
      {
        domain: "auth",
        families: [{ family: "auth.session", eventTypes: ["auth.session.started"] }],
      },
      {
        domain: "company",
        families: [
          {
            family: "company.lifecycle",
            eventTypes: ["company.lifecycle.created", "company.lifecycle.frozen"],
          },
          {
            family: "company.profile",
            eventTypes: ["company.profile.material_updated"],
          },
        ],
      },
    ]);
  });

  it("keeps a single-segment event type addressable as its own family", () => {
    expect(buildAuditEventTaxonomy(["heartbeat"])).toEqual([
      { domain: "heartbeat", families: [{ family: "heartbeat", eventTypes: ["heartbeat"] }] },
    ]);
  });
});
