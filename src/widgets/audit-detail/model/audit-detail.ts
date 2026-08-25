import type { CatalogAuditTarget } from "./audit-catalog";

export type AuditTarget = CatalogAuditTarget;

export type AuditDetailKind = "field-diff" | "changed-field-list" | "scalar-bag";

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface Transition {
  beforeKey: string;
  afterKey: string;
  before: unknown;
  after: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFieldDiff(
  details: Record<string, unknown>,
): details is { changes: FieldChange[] } {
  return (
    Array.isArray(details.changes) &&
    details.changes.every(
      (change) =>
        isRecord(change) &&
        typeof change.field === "string" &&
        "before" in change &&
        "after" in change,
    )
  );
}

export function isChangedFieldList(
  details: Record<string, unknown>,
): details is { changedFields: string[] } {
  return (
    Array.isArray(details.changedFields) &&
    details.changedFields.every((field) => typeof field === "string")
  );
}

export function getAuditDetailKind(details: Record<string, unknown>): AuditDetailKind {
  if (isFieldDiff(details)) return "field-diff";
  if (isChangedFieldList(details)) return "changed-field-list";
  return "scalar-bag";
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function collectTransitions(details: Record<string, unknown>): {
  transitions: Transition[];
  consumedKeys: Set<string>;
} {
  const transitions: Transition[] = [];
  const consumedKeys = new Set<string>();

  for (const [beforeKey, before] of Object.entries(details)) {
    const match = /^(previous|before|from)([A-Z].+)$/.exec(beforeKey);
    if (!match) continue;

    const prefix = match[1];
    const suffix = match[2];
    const afterKey =
      prefix === "previous"
        ? lowerFirst(suffix)
        : `${prefix === "before" ? "after" : "to"}${suffix}`;
    if (!(afterKey in details)) continue;

    transitions.push({
      beforeKey,
      afterKey,
      before,
      after: details[afterKey],
    });
    consumedKeys.add(beforeKey);
    consumedKeys.add(afterKey);
  }

  return { transitions, consumedKeys };
}

export function isInstantKey(key: string): boolean {
  return /(?:At|Date)$/.test(key) || key === "effectiveFrom" || key === "effectiveUntil";
}
