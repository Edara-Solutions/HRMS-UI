import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAuditLabels, diffAuditLabelKeys } from "./check-audit-labels.mjs";
import { auditLabelArtifacts } from "./contract-artifacts.mjs";
import { frontendRoot } from "./contract-provenance.mjs";

const manifest = JSON.parse(readFileSync(auditLabelArtifacts.manifestPath, "utf-8"));
const expected = [...manifest.events, ...manifest.fields];

function readLocale(locale) {
  return JSON.parse(
    readFileSync(join(frontendRoot, "public", "locales", locale, "audit.json"), "utf-8"),
  );
}

function diff(resources) {
  return diffAuditLabelKeys({ expected, enums: manifest.enums, resources, reference: "en" });
}

describe("audit label check", () => {
  it("passes for the shipped resources", () => {
    expect(checkAuditLabels()).toEqual([]);
  });

  it("fails when a key is deleted", () => {
    const en = readLocale("en");
    delete en["auth.session.started"];

    const failures = diff({ en, ar: readLocale("ar") });

    expect(failures.join(" ")).toContain("auth.session.started");
  });

  it("fails on a label for an event the contract no longer emits", () => {
    const en = { ...readLocale("en"), "company.lifecycle.renamed": "Company renamed" };

    const failures = diff({ en, ar: readLocale("ar") });

    expect(failures.join(" ")).toContain("company.lifecycle.renamed");
  });

  it("fails on an override for an enum value the contract no longer emits", () => {
    const en = { ...readLocale("en"), "enum.stepType.SET_PAYROLL": "Payroll" };

    const failures = diff({ en, ar: readLocale("ar") });

    expect(failures.join(" ")).toContain("enum.stepType.SET_PAYROLL");
  });

  it("measures locale parity on the base key, so Arabic can add its own plural forms", () => {
    const ar = { ...readLocale("ar"), "chrome.eventCount_few": "{{count}} events" };

    expect(diff({ en: readLocale("en"), ar })).toEqual([]);
  });
});
