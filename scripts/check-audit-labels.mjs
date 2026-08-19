// Fails the build when the authored `audit` namespace drifts from the contract:
// a catalog event or payload field with no label, an override for an enum value the
// contract no longer emits, or a label for something that no longer exists. Run from
// `openapi:check`, beside the other gates that keep generated and authored artifacts
// in step.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auditLabelArtifacts } from "./contract-artifacts.mjs";
import { frontendRoot } from "./contract-provenance.mjs";

const localesDir = join(frontendRoot, "public", "locales");

/** The locale whose key set every other locale is measured against. */
const referenceLocale = "en";
const locales = [referenceLocale, "ar"];

// i18next appends a CLDR plural category to a key it inflects. English needs two forms
// and Arabic six, so parity is measured on the base key — otherwise translating Arabic
// would mean changing this gate rather than only the resources.
const pluralSuffixPattern = /_(?:zero|one|two|few|many|other)$/;
const enumOverridePattern = /^enum\.([^.]+)\.(.+)$/;

function baseKey(key) {
  return key.replace(pluralSuffixPattern, "");
}

/**
 * Compares the authored resources against the generated key set.
 * Returns one message per failure, empty when the namespace is in step.
 */
export function diffAuditLabelKeys({ expected, enums, resources, reference }) {
  const failures = [];
  const expectedKeys = new Set(expected);
  const referenceKeys = new Set(Object.keys(resources[reference]).map(baseKey));

  for (const [locale, resource] of Object.entries(resources)) {
    const keys = Object.keys(resource);
    const missing = expected.filter((key) => !(key in resource));
    const orphaned = keys.filter((key) => !expectedKeys.has(key) && !isAuthored(key, enums));
    const blank = keys.filter((key) => String(resource[key]).trim() === "");

    if (missing.length > 0) {
      failures.push(`${locale}: missing ${missing.length} — ${missing.join(", ")}`);
    }
    if (orphaned.length > 0) {
      failures.push(`${locale}: orphaned ${orphaned.length} — ${orphaned.join(", ")}`);
    }
    if (blank.length > 0) {
      failures.push(`${locale}: blank ${blank.length} — ${blank.join(", ")}`);
    }
    if (locale === reference) continue;

    const localeKeys = new Set(keys.map(baseKey));
    const divergent = [
      ...[...localeKeys].filter((key) => !referenceKeys.has(key)),
      ...[...referenceKeys].filter((key) => !localeKeys.has(key)),
    ];
    if (divergent.length > 0) {
      failures.push(
        `${locale} and ${reference} carry different key sets — ${divergent.join(", ")}`,
      );
    }
  }

  return failures;
}

// Chrome copy is the page's own words, with no contract counterpart. An enum override is
// authored too, but only for a value the contract actually emits.
function isAuthored(key, enums) {
  if (key.startsWith("chrome.")) return true;

  const override = enumOverridePattern.exec(key);
  if (!override) return false;
  return (enums[override[1]] ?? []).includes(override[2]);
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
    enums: manifest.enums,
    resources,
    reference: referenceLocale,
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
