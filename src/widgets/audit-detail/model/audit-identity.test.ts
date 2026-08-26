import { describe, expect, it } from "vitest";
import type { AuditTranslate } from "@/features/audit-filters";
import { auditTargetDestination, presentAuditActor, presentAuditTarget } from "./audit-identity";

// The words are the namespace's job; these tests are about which state was chosen, so the
// translator echoes its key back and every assertion reads as the key it expects.
const t = ((key: string) => key) as unknown as AuditTranslate;

describe("presentAuditActor", () => {
  it("keeps all six actor states distinct", () => {
    const states = [
      presentAuditActor({ kind: "USER", publicId: "u-1", name: "Layla Mansour" }, t).state,
      presentAuditActor({ kind: "USER", publicId: "u-2", name: null }, t).state,
      presentAuditActor({ kind: "SYSTEM", component: "EMAIL_WORKER" }, t).state,
      presentAuditActor({ kind: "ANONYMOUS" }, t).state,
      presentAuditActor({ kind: "ATTRIBUTION_FAILED" }, t).state,
      presentAuditActor({ kind: "ERASED_USER" }, t).state,
    ];

    expect(new Set(states).size).toBe(states.length);
  });

  it("names an actor the wire resolved", () => {
    const actor = presentAuditActor({ kind: "USER", publicId: "u-1", name: "Layla Mansour" }, t);

    expect(actor).toMatchObject({
      state: "named",
      primary: "Layla Mansour",
      secondary: "User",
      filterablePublicId: "u-1",
    });
  });

  it("shows a truncated id, not a blank, for a user whose name did not resolve", () => {
    const actor = presentAuditActor(
      { kind: "USER", publicId: "6f1d9c22-0f4e-4c33-9a5b-2d1c8e77b410", name: null },
      t,
    );

    expect(actor.state).toBe("unresolved");
    expect(actor.primary).toBe("6f1d9c22…");
    expect(actor.filterablePublicId).toBe("6f1d9c22-0f4e-4c33-9a5b-2d1c8e77b410");
  });

  it("names the component behind a system actor", () => {
    expect(presentAuditActor({ kind: "SYSTEM", component: "EMAIL_WORKER" }, t)).toMatchObject({
      state: "system",
      primary: "Email worker",
    });
  });

  it("reads an unattributed event as a defect rather than an actor category", () => {
    const failed = presentAuditActor({ kind: "ATTRIBUTION_FAILED" }, t);

    expect(failed.state).toBe("attribution-failed");
    expect(failed.primary).toBe("chrome.attributionFailed");
    expect(failed.filterablePublicId).toBeUndefined();
  });

  it("withholds the Company trail's platform admin, which carries no identity fields", () => {
    const admin = presentAuditActor({ kind: "PLATFORM_ADMIN" }, t);

    expect(admin).toEqual({
      state: "withheld",
      primary: "chrome.platformAdmin",
      secondary: "chrome.identityWithheld",
    });
  });

  it("names a platform admin the Platform trail does identify", () => {
    expect(
      presentAuditActor({ kind: "PLATFORM_ADMIN", publicId: "a-1", name: "Omar" }, t),
    ).toMatchObject({ state: "named", primary: "Omar", secondary: "Platform admin" });
  });
});

describe("auditTargetDestination", () => {
  it("routes the two admin target types that have a detail page", () => {
    expect(auditTargetDestination("admin", "company")).toBe("admin-company");
    expect(auditTargetDestination("admin", "lead")).toBe("admin-lead");
  });

  it("offers no destination for a type with no route in either portal", () => {
    expect(auditTargetDestination("admin", "user")).toBeNull();
    expect(auditTargetDestination("admin", "session")).toBeNull();
  });

  it("offers the Company portal no destination at all", () => {
    for (const targetType of ["company", "lead", "user", "session", "company_subscription"]) {
      expect(auditTargetDestination("company", targetType)).toBeNull();
    }
  });

  it("is total: an unknown target type resolves to no destination without throwing", () => {
    expect(() => auditTargetDestination("admin", "payroll_run")).not.toThrow();
    expect(auditTargetDestination("admin", "payroll_run")).toBeNull();
    // A key from Object.prototype is a lookup, not a destination.
    expect(auditTargetDestination("admin", "constructor")).toBeNull();
  });
});

describe("presentAuditTarget", () => {
  it("links a named company on the admin trail", () => {
    expect(
      presentAuditTarget({ targetType: "company", publicId: "c-1", name: "Nexus" }, "admin"),
    ).toEqual({
      typeLabel: "Company",
      name: "Nexus",
      publicId: "c-1",
      erased: false,
      destination: "admin-company",
    });
  });

  it("degrades an unresolved entity to text rather than a dead link", () => {
    expect(
      presentAuditTarget({ targetType: "company", publicId: "c-1", name: null }, "admin"),
    ).toMatchObject({ name: null, destination: null });
  });

  it("names a user target but never links it, because no user detail route exists", () => {
    expect(
      presentAuditTarget({ targetType: "user", publicId: "u-1", name: "Layla" }, "admin"),
    ).toMatchObject({ name: "Layla", destination: null });
  });

  it("offers no link on the Company trail even for a named company", () => {
    expect(
      presentAuditTarget({ targetType: "company", publicId: "c-1", name: "Nexus" }, "company"),
    ).toMatchObject({ destination: null });
  });

  it("reads the erased sentinel before any id formatting, so it is never truncated or linked", () => {
    const erased = presentAuditTarget({ targetType: "user", publicId: "ERASED" }, "admin");

    expect(erased).toEqual({
      typeLabel: "User",
      name: null,
      publicId: "",
      erased: true,
      destination: null,
    });
  });

  it("renders an unknown target type as words with no destination", () => {
    expect(
      presentAuditTarget({ targetType: "payroll_run", publicId: "p-1" }, "admin"),
    ).toMatchObject({
      typeLabel: "Payroll run",
      destination: null,
    });
  });
});
