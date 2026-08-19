// The label key set the `audit` i18n namespace must carry, read straight from the
// vendored contract. The backend defines what exists; the frontend defines what it
// is called — so the keys are generated here and the values are hand-authored.

import { readFileSync } from "node:fs";
import { openApiPath } from "./contract-provenance.mjs";

/** The Audit Trail page schemas whose event unions carry every catalog payload. */
const auditPageSchemas = ["PlatformAuditTrailPage", "CompanyAuditTrailPage"];

// `changes` / `changedFields` are containers and `before` / `after` / `field` are the
// diff's own machinery — none of them is ever rendered as a label. The values of the
// `field` enum are field names wearing an enum's clothes, so they join the field list.
const structuralDetailKeys = new Set(["changes", "changedFields", "before", "after", "field"]);

/**
 * Reads the vendored contract and returns the label keys plus the closed enums.
 * `events` are keyed by the event type itself, so a missing label renders as the
 * raw event type; `fields` are prefixed to keep them clear of the event keys.
 */
export function collectAuditLabelKeys() {
  const document = JSON.parse(readFileSync(openApiPath, "utf-8"));
  const schemas = document.components?.schemas ?? {};

  const events = new Set();
  const fields = new Set();
  const enums = new Map();

  function walk(schema, key) {
    if (!schema || typeof schema !== "object") return;

    for (const branch of schema.anyOf ?? schema.oneOf ?? schema.allOf ?? []) walk(branch, key);
    if (schema.enum && key) {
      const values = enums.get(key) ?? new Set();
      for (const value of schema.enum) values.add(value);
      enums.set(key, values);
    }
    if (schema.type === "array") walk(schema.items, key);

    for (const [property, child] of Object.entries(schema.properties ?? {})) {
      if (!structuralDetailKeys.has(property)) fields.add(property);
      walk(child, property);
    }
  }

  for (const schemaName of auditPageSchemas) {
    const page = schemas[schemaName];
    if (!page) throw new Error(`Contract is missing ${schemaName}`);

    for (const event of page.properties.items.items.anyOf) {
      events.add(event.properties.eventType.enum[0]);
      walk(event.properties.details, null);
    }
  }

  for (const value of enums.get("field") ?? []) fields.add(value);
  enums.delete("field");

  return {
    events: [...events].sort(),
    fields: [...fields].sort().map((field) => `field.${field}`),
    enums: Object.fromEntries([...enums].sort().map(([key, values]) => [key, [...values].sort()])),
  };
}
