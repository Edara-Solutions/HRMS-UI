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

describe("audit label check", () => {
  it("passes for the shipped resources", () => {
    expect(checkAuditLabels()).toEqual([]);
  });

  it("fails when a key is deleted", () => {
    const en = readLocale("en");
    delete en["auth.session.started"];

    const failures = diffAuditLabelKeys({ expected, resources: { en, ar: readLocale("ar") } });

    expect(failures.join("\n")).toContain("auth.session.started");
  });

  it("fails on a label for something the contract no longer emits", () => {
    const en = { ...readLocale("en"), "company.lifecycle.renamed": "Company renamed" };

    const failures = diffAuditLabelKeys({ expected, resources: { en, ar: readLocale("ar") } });

    expect(failures.join("\n")).toContain("company.lifecycle.renamed");
  });
});
