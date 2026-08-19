// Fails the build when the authored `audit` namespace drifts from the contract:
// a catalog event or payload field with no label, or a label for something the
// contract no longer emits. Run from `openapi:check`, beside the other gates that
// keep generated and authored artifacts in step.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auditLabelArtifacts } from "./contract-artifacts.mjs";
import { frontendRoot } from "./contract-provenance.mjs";

// Chrome copy and enum overrides are authored without a contract counterpart: the page's
// own words, and the handful of enum values whose derived form misleads.
const authoredPrefixes = ["chrome.", "enum."];

const localesDir = join(frontendRoot, "public", "locales");
const locales = ["en", "ar"];

/**
 * Compares the authored resources against the generated key set.
 * Returns one message per failure, empty when the namespace is in step.
 */
export function diffAuditLabelKeys({ expected, resources }) {
  const failures = [];
  const expectedKeys = new Set(expected);

  for (const [locale, resource] of Object.entries(resources)) {
    const keys = Object.keys(resource);
    const missing = expected.filter((key) => !(key in resource));
    const orphaned = keys.filter(
      (key) => !expectedKeys.has(key) && !authoredPrefixes.some((p) => key.startsWith(p)),
    );
    const blank = keys.filter((key) => String(resource[key]).trim() === "");

    if (missing.length > 0)
      failures.push(`${locale}: missing ${missing.length} — ${missing.join(", ")}`);
    if (orphaned.length > 0)
      failures.push(`${locale}: orphaned ${orphaned.length} — ${orphaned.join(", ")}`);
    if (blank.length > 0) failures.push(`${locale}: blank ${blank.length} — ${blank.join(", ")}`);
  }

  const [reference, ...others] = Object.keys(resources);
  for (const locale of others) {
    const onlyHere = Object.keys(resources[locale]).filter((key) => !(key in resources[reference]));
    const onlyThere = Object.keys(resources[reference]).filter(
      (key) => !(key in resources[locale]),
    );
    if (onlyHere.length > 0 || onlyThere.length > 0) {
      failures.push(
        `${locale} and ${reference} carry different key sets — ${[...onlyHere, ...onlyThere].join(", ")}`,
      );
    }
  }

  return failures;
}

/** Reads the manifest and both resource files, then reports every failure. */
export function checkAuditLabels() {
  const manifest = JSON.parse(readFileSync(auditLabelArtifacts.manifestPath, "utf-8"));
  const resources = Object.fromEntries(
    locales.map((locale) => [
      locale,
      JSON.parse(readFileSync(join(localesDir, locale, "audit.json"), "utf-8")),
    ]),
  );

  return diffAuditLabelKeys({
    expected: [...manifest.events, ...manifest.fields],
    resources,
  });
}

/** Prints every failure and returns whether the namespace is in step. */
export function reportAuditLabels() {
  const failures = checkAuditLabels();
  if (failures.length === 0) {
    console.log("audit labels complete -> public/locales/{en,ar}/audit.json");
    return true;
  }

  console.error("\nThe `audit` namespace is out of step with contracts/openapi.json:");
  for (const failure of failures) console.error(`  ${failure}`);
  console.error("\nAuthor the labels in public/locales/{en,ar}/audit.json and try again.");
  return false;
}

if (import.meta.main && !reportAuditLabels()) {
  process.exit(1);
}
